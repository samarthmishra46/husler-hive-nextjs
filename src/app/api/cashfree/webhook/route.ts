import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Payment from '@/models/Payment';
import AuditLog from '@/models/AuditLog';
import { verifyWebhookSignature } from '@/lib/cashfree';
import { removeRoleFromUser } from '@/lib/discord';

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

/** Find user by their Cashfree subscription ID */
async function findUser(data: Record<string, unknown>) {
  const subscriptionId = getSubscriptionId(data);
  if (!subscriptionId) return null;
  return User.findOne({ cashfreeSubscriptionId: subscriptionId });
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

        const user = await findUser(data);
        if (!user) break;

        if (INACTIVE_STATUSES.includes(newStatus.toUpperCase())) {
          // User lost access — update status and kick
          user.subscriptionStatus = 'cancelled' as const;
          await user.save();

          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'left_channel',
            details: `Subscription status: ${newStatus}`,
          });

          await revokeDiscordAccess(user, `Subscription ${newStatus}`);

        } else if (newStatus.toUpperCase() === 'ACTIVE') {
          // Subscription is active
          user.subscriptionStatus = 'active' as const;
          await user.save();

          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'subscribed',
            details: 'Subscription activated',
          });
        } else if (newStatus.toUpperCase() === 'BANK_APPROVAL_PENDING') {
          // Waiting for bank — just log
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

        const user = await findUser(data);
        if (!user) break;

        if (authStatus.toUpperCase() === 'ACTIVE' || paymentStatus.toUpperCase() === 'SUCCESS') {
          if (user.subscriptionStatus === 'none') {
            user.subscriptionStatus = 'trial' as const;
            await user.save();
          }
          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'subscribed',
            details: `Auth successful (${paymentStatus})`,
          });
        } else if (authStatus.toUpperCase() === 'FAILED' || paymentStatus.toUpperCase() === 'FAILED') {
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
        const user = await findUser(data);
        if (!user) break;

        user.subscriptionStatus = 'active' as const;
        await user.save();

        await Payment.create({
          userId: user._id,
          cashfreeSubscriptionId: subscriptionId,
          amount: Number(data.payment_amount) || 0,
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
            user.subscriptionStatus = 'cancelled' as const;
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
