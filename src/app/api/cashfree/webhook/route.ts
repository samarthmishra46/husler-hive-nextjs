import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Payment from '@/models/Payment';
import AuditLog from '@/models/AuditLog';
import { verifyWebhookSignature } from '@/lib/cashfree';
import { removeRoleFromUser } from '@/lib/discord';
import { sendWelcomeEmailIfNeeded } from '@/lib/email';
import { recurringPlanKeyByAmount } from '@/lib/plans';
import type { PlanKey } from '@/lib/plans';

// ─── Helpers ────────────────────────────────────────────────

/**
 * Extract subscription_id from Cashfree webhook payload.
 * Payment events: data.subscription_id
 * Status events:  data.subscription_details.subscription_id
 */
function getSubscriptionId(data: Record<string, unknown>): string {
  const subDetails = data.subscription_details as Record<string, unknown> | undefined;
  return (
    (data.subscription_id as string) ||
    (subDetails?.subscription_id as string) ||
    ''
  );
}

/** Find user by their Cashfree subscription ID (read-only — never creates) */
async function findUser(data: Record<string, unknown>) {
  const subscriptionId = getSubscriptionId(data);
  if (!subscriptionId) return null;
  return User.findOne({ cashfreeSubscriptionId: subscriptionId });
}

/**
 * Find or create the User for a successful auth/payment event.
 *
 * The subscribe route no longer writes to MongoDB — the user record is materialized
 * here, only when Cashfree confirms an authorization or charge succeeded. We pull
 * email/phone/plan from the webhook's subscription_details payload.
 */
async function findOrCreateUser(data: Record<string, unknown>, plan: PlanKey) {
  const subscriptionId = getSubscriptionId(data);
  if (!subscriptionId) return null;

  // 1. Already linked to this subscription — use it.
  let user = await User.findOne({ cashfreeSubscriptionId: subscriptionId });
  if (user) return user;

  // Cashfree returns customer info at data.customer_details (top-level), matching
  // the shape we sent in the subscribe request. Some events also include a copy
  // under subscription_details — check both so we degrade gracefully if the API
  // shape shifts.
  const subDetails = (data.subscription_details || {}) as Record<string, unknown>;
  const customerDetails = (data.customer_details ||
    subDetails.customer_details ||
    {}) as Record<string, unknown>;

  const email = String(
    customerDetails.customer_email ||
    subDetails.customer_email ||
    ''
  ).toLowerCase().trim();
  const phone = String(
    customerDetails.customer_phone ||
    subDetails.customer_phone ||
    ''
  ).trim();

  if (!email) {
    console.error(
      `[Webhook] findOrCreateUser: no customer_email for sub=${subscriptionId}. data keys: ${Object.keys(data).join(',')}`
    );
    return null;
  }

  // 2. Returning customer (e.g. trial expired, paying again) — link this sub to them.
  user = await User.findOne({ email });
  if (user) {
    user.cashfreeSubscriptionId = subscriptionId;
    if (phone) user.mobile = phone;
    user.plan = plan;
    await user.save();
    return user;
  }

  // 3. Brand new customer — create the record now that payment is confirmed.
  // Status starts 'expired' (the schema default) and the calling event promotes
  // it to 'active' immediately once it confirms the auth/charge succeeded.
  return User.create({
    email,
    mobile: phone || 'unknown',
    cashfreeSubscriptionId: subscriptionId,
    subscriptionStatus: 'expired',
    trialUsed: false,
    channelAdded: false,
    plan,
  });
}

/** Derive plan from Cashfree's recurring/max amount. Checked across plan_details
 *  (top-level, matches the shape we sent) and subscription_details as a fallback.
 *  Recurring plan amounts are unique, so we map amount → PlanKey directly. */
function getPlanFromData(data: Record<string, unknown>): PlanKey {
  const planDetails = (data.plan_details || {}) as Record<string, unknown>;
  const subDetails = (data.subscription_details || {}) as Record<string, unknown>;
  const amount = Number(
    planDetails.plan_recurring_amount ||
    planDetails.plan_max_amount ||
    planDetails.plan_amount ||
    subDetails.plan_recurring_amount ||
    subDetails.plan_max_amount ||
    0
  );
  return recurringPlanKeyByAmount(amount);
}

/** Remove paid role from user in Discord */
async function revokeDiscordAccess(
  user: InstanceType<typeof User>,
  reason: string
) {
  if (!user.discordId || !user.channelAdded) return;
  try { await removeRoleFromUser(user.discordId); } catch (e) { console.error('Remove role error:', e); }
  user.channelAdded = false;
  user.leftAt = new Date();
  await user.save();
  await AuditLog.create({
    userId: user._id,
    userEmail: user.email,
    action: 'role_removed',
    details: reason,
  });
}

// Statuses that mean the user should lose access
const INACTIVE_STATUSES = [
  'CANCELLED',
  'CUSTOMER_CANCELLED',
  'CUSTOMER_PAUSED',
  'EXPIRED',
  'COMPLETED',
  'ON_HOLD',
  'LINK_EXPIRED',
  'CARD_EXPIRED',
];

// ─── Webhook Handler ────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-cashfree-signature') || '';

    // Verify webhook signature
    if (process.env.CASHFREE_SECRET_KEY && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType: string = payload.type || '';
    const data = (payload.data || {}) as Record<string, unknown>;
    const subscriptionId = getSubscriptionId(data);

    console.log(`[Webhook] ${eventType} | sub: ${subscriptionId}`);

    await dbConnect();

    switch (eventType) {
      // ═══════════════════════════════════════════════════
      // 1. SUBSCRIPTION_STATUS_CHANGED
      //    Fired when subscription moves to any status:
      //    ACTIVE, CANCELLED, CUSTOMER_CANCELLED, EXPIRED, etc.
      //    This is the PRIMARY event for cancellation kicks.
      // ═══════════════════════════════════════════════════
      case 'SUBSCRIPTION_STATUS_CHANGED': {
        const subDetails = data.subscription_details as Record<string, unknown> | undefined;
        const newStatus = (subDetails?.subscription_status as string) || '';

        console.log(`[Webhook] Status changed → ${newStatus}`);

        const upper = newStatus.toUpperCase();

        if (upper === 'ACTIVE') {
          // First confirmation from Cashfree that auth succeeded — materialize the user.
          const user = await findOrCreateUser(data, getPlanFromData(data));
          if (!user) break;

          // Auth charges the full plan amount upfront (no trial), so an ACTIVE
          // subscription means the user has paid — mark them active.
          if (user.subscriptionStatus !== 'active') {
            user.subscriptionStatus = 'active' as const;
            await user.save();
          }

          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'subscribed',
            details: 'Subscription activated at Cashfree',
          });

          await sendWelcomeEmailIfNeeded(user);
        } else if (INACTIVE_STATUSES.includes(upper)) {
          // Inactive events for an unknown sub mean the user never paid — ignore.
          const user = await findUser(data);
          if (!user) break;

          user.subscriptionStatus = 'expired' as const;
          await user.save();

          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'left_channel',
            details: `Subscription status: ${newStatus}`,
          });

          await revokeDiscordAccess(user, `Subscription ${newStatus}`);
        } else if (upper === 'BANK_APPROVAL_PENDING') {
          const user = await findUser(data);
          if (!user) break;
          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'subscribed',
            details: `Subscription: ${newStatus}`,
          });
        }
        break;
      }

      // ═══════════════════════════════════════════════════
      // 2. SUBSCRIPTION_AUTH_STATUS
      //    Fired when initial authorization succeeds/fails.
      //    data.authorization_details.authorization_status = ACTIVE | FAILED
      // ═══════════════════════════════════════════════════
      case 'SUBSCRIPTION_AUTH_STATUS': {
        const authDetails = data.authorization_details as Record<string, unknown> | undefined;
        const authStatus = (authDetails?.authorization_status as string) || '';
        const paymentStatus = (data.payment_status as string) || '';

        console.log(`[Webhook] Auth status: ${authStatus}, Payment: ${paymentStatus}`);

        const success = authStatus.toUpperCase() === 'ACTIVE' || paymentStatus.toUpperCase() === 'SUCCESS';
        // Only materialize the user on success — failed auths must not write to the DB.
        const user = success
          ? await findOrCreateUser(data, getPlanFromData(data))
          : await findUser(data);
        if (!user) break;

        if (success) {
          // Save the authorization payment so it appears in Finance (full plan amount, charged upfront).
          const authAmount = Number(authDetails?.authorization_amount || (data.payment_amount as number)) || 1;

          // Auth charges the full plan amount upfront — a successful auth means the
          // user has paid. Mark them active (don't re-write an already-active user).
          if (user.subscriptionStatus !== 'active') {
            user.subscriptionStatus = 'active' as const;
            await user.save();
          }
          const authCfPaymentId = String(
            (authDetails as Record<string, unknown>)?.cf_payment_id ||
            data.cf_payment_id ||
            data.cfPaymentId ||
            ''
          );
          if (authCfPaymentId) {
            const exists = await Payment.findOne({ cfPaymentId: authCfPaymentId });
            if (!exists) {
              await Payment.create({
                userId: user._id,
                cashfreeSubscriptionId: subscriptionId,
                amount: authAmount,
                status: 'success',
                paidAt: new Date(),
                cfPaymentId: authCfPaymentId,
              });
            }
          }

          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'subscribed',
            details: `Auth successful (${paymentStatus})`,
          });

          await sendWelcomeEmailIfNeeded(user);
        } else if (authStatus.toUpperCase() === 'FAILED' || paymentStatus.toUpperCase() === 'FAILED') {
          // Auth failed — the user never paid, so they have no access.
          if (user.subscriptionStatus !== 'active') {
            user.subscriptionStatus = 'expired' as const;
            await user.save();
          }
          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'payment_failed',
            details: `Auth failed: ${(data.failure_details as Record<string, unknown>)?.failure_reason || 'Unknown'}`,
          });
        }
        break;
      }

      // ═══════════════════════════════════════════════════
      // 3. SUBSCRIPTION_PAYMENT_SUCCESS
      //    Recurring payment charged successfully.
      // ═══════════════════════════════════════════════════
      case 'SUBSCRIPTION_PAYMENT_SUCCESS': {
        // Real recurring charge — materialize the user if we somehow missed the auth event.
        const user = await findOrCreateUser(data, getPlanFromData(data));
        if (!user) break;

        const paymentAmount = Number(data.payment_amount) || 0;

        // Any successful charge means the subscription is paid — mark active.
        if (user.subscriptionStatus !== 'active') {
          user.subscriptionStatus = 'active' as const;
          await user.save();
        }

        await Payment.create({
          userId: user._id,
          cashfreeSubscriptionId: subscriptionId,
          amount: paymentAmount,
          status: 'success',
          paidAt: new Date(),
          cfPaymentId: String(data.cf_payment_id || data.payment_id || ''),
        });

        await AuditLog.create({
          userId: user._id, userEmail: user.email,
          action: 'payment_success',
          details: `₹${data.payment_amount} received (${data.payment_type || 'CHARGE'})`,
        });
        break;
      }

      // ═══════════════════════════════════════════════════
      // 4. SUBSCRIPTION_PAYMENT_FAILED
      //    Recurring payment failed (insufficient funds, etc.)
      //    Kicks user from Discord.
      // ═══════════════════════════════════════════════════
      case 'SUBSCRIPTION_PAYMENT_FAILED': {
        const user = await findUser(data);
        if (!user) break;

        user.subscriptionStatus = 'expired' as const;
        await user.save();

        const failureDetails = data.failure_details as Record<string, unknown> | undefined;

        await Payment.create({
          userId: user._id,
          cashfreeSubscriptionId: subscriptionId,
          amount: Number(data.payment_amount) || 0,
          status: 'failed',
          cfPaymentId: String(data.cf_payment_id || data.payment_id || ''),
        });

        await AuditLog.create({
          userId: user._id, userEmail: user.email,
          action: 'payment_failed',
          details: `Payment failed: ${failureDetails?.failure_reason || 'Unknown reason'}`,
        });

        await revokeDiscordAccess(user, 'Payment failed');
        break;
      }

      // ═══════════════════════════════════════════════════
      // 5. SUBSCRIPTION_PAYMENT_CANCELLED
      //    A scheduled payment was cancelled (subscription itself
      //    may also be cancelling — status change handles kick).
      // ═══════════════════════════════════════════════════
      case 'SUBSCRIPTION_PAYMENT_CANCELLED': {
        const user = await findUser(data);
        if (!user) break;

        await Payment.create({
          userId: user._id,
          cashfreeSubscriptionId: subscriptionId,
          amount: Number(data.payment_amount) || 0,
          status: 'failed',
          cfPaymentId: String(data.cf_payment_id || data.payment_id || ''),
        });

        await AuditLog.create({
          userId: user._id, userEmail: user.email,
          action: 'payment_failed',
          details: 'Scheduled payment cancelled',
        });
        break;
      }

      // ═══════════════════════════════════════════════════
      // 6. SUBSCRIPTION_PAYMENT_NOTIFICATION_INITIATED
      //    Cashfree notified the customer about an upcoming charge.
      //    Just log — no action needed.
      // ═══════════════════════════════════════════════════
      case 'SUBSCRIPTION_PAYMENT_NOTIFICATION_INITIATED': {
        const user = await findUser(data);
        console.log(`[Webhook] Payment notification sent for sub ${subscriptionId}`);
        if (user) {
          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'subscribed',
            details: `Payment notification sent (upcoming charge ₹${data.payment_amount || '?'})`,
          });
        }
        break;
      }

      // ═══════════════════════════════════════════════════
      // 7. SUBSCRIPTION_REFUND_STATUS
      //    Refund processed. If successful, kick user.
      // ═══════════════════════════════════════════════════
      case 'SUBSCRIPTION_REFUND_STATUS': {
        const refundStatus = (data.refund_status as string) || '';
        const refundAmount = data.refund_amount || 0;

        console.log(`[Webhook] Refund ${refundStatus} — ₹${refundAmount}`);

        // Refund events don't have subscription_details, find user by payment
        const cfPaymentId = data.cf_payment_id as string;
        let user = null;
        if (cfPaymentId) {
          const payment = await Payment.findOne({ cfPaymentId });
          if (payment) user = await User.findById(payment.userId);
        }

        if (user) {
          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'payment_failed',
            details: `Refund ${refundStatus}: ₹${refundAmount}`,
          });

          if (refundStatus.toUpperCase() === 'SUCCESS') {
            user.subscriptionStatus = 'expired' as const;
            await user.save();
            await revokeDiscordAccess(user, 'Refund processed');
          }
        }
        break;
      }

      // ═══════════════════════════════════════════════════
      // 8. SUBSCRIPTION_CARD_EXPIRY_REMINDER
      //    Customer's card is about to expire. Log only.
      // ═══════════════════════════════════════════════════
      case 'SUBSCRIPTION_CARD_EXPIRY_REMINDER': {
        console.log(`[Webhook] Card expiry reminder for sub ${subscriptionId}`);
        const user = await findUser(data);
        if (user) {
          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'payment_failed',
            details: 'Card expiry reminder — customer notified to update payment method',
          });
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event: ${eventType}`, JSON.stringify(data).slice(0, 300));
    }

    // Always return 200 to Cashfree
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    // Still return 200 to prevent Cashfree retries on our errors
    return NextResponse.json({ success: true });
  }
}
