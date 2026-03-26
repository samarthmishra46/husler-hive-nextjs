import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Payment from '@/models/Payment';
import AuditLog from '@/models/AuditLog';
import { verifyWebhookSignature } from '@/lib/cashfree';
import { removeUserFromChannel, kickUserFromGuild } from '@/lib/discord';

// Helper: find user by subscription ID
async function findUserBySub(data: Record<string, unknown>) {
  const sub = data.subscription as Record<string, unknown> | undefined;
  const subscriptionId = sub?.subscription_id || data.subscription_id;
  if (!subscriptionId) return null;
  return User.findOne({ cashfreeSubscriptionId: subscriptionId });
}

// Helper: kick user from Discord
async function kickFromDiscord(user: InstanceType<typeof User>) {
  if (!user.discordId || !user.channelAdded) return;
  try {
    await removeUserFromChannel(user.discordId);
  } catch (err) { console.error('Error removing from channel:', err); }
  try {
    await kickUserFromGuild(user.discordId);
  } catch (err) { console.error('Error kicking from guild:', err); }
  user.channelAdded = false;
  user.leftAt = new Date();
  await user.save();
  await AuditLog.create({
    userId: user._id,
    userEmail: user.email,
    action: 'kicked',
    details: `Kicked from Discord`,
  });
}

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
    const eventType = payload.type || payload.event;
    const data = payload.data || payload;
    const sub = (data.subscription || {}) as Record<string, unknown>;
    const subscriptionId = sub.subscription_id || data.subscription_id || '';

    console.log(`Webhook received: ${eventType} for subscription ${subscriptionId}`);

    await dbConnect();

    switch (eventType) {
      // ─── Payment Success ───
      case 'SUBSCRIPTION_PAYMENT_CHARGED':
      case 'SUBSCRIPTION_PAYMENT_SUCCESS':
      case 'PAYMENT_SUCCESS_WEBHOOK': {
        const user = await findUserBySub(data);
        if (user) {
          user.subscriptionStatus = 'active';
          await user.save();

          await Payment.create({
            userId: user._id,
            cashfreeSubscriptionId: subscriptionId,
            amount: sub.amount || data.amount || 0,
            status: 'success',
            paidAt: new Date(),
            cfPaymentId: data.cf_payment_id || data.payment_id,
          });

          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'payment_success',
            details: `Payment received for subscription ${subscriptionId}`,
          });
        }
        break;
      }

      // ─── Payment Failed ───
      case 'SUBSCRIPTION_PAYMENT_DECLINED':
      case 'SUBSCRIPTION_PAYMENT_FAILED':
      case 'PAYMENT_FAILED_WEBHOOK': {
        const user = await findUserBySub(data);
        if (user) {
          user.subscriptionStatus = 'expired';
          await user.save();

          await Payment.create({
            userId: user._id,
            cashfreeSubscriptionId: subscriptionId,
            amount: sub.amount || data.amount || 0,
            status: 'failed',
            cfPaymentId: data.cf_payment_id || data.payment_id,
          });

          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'payment_failed',
            details: `Payment failed for subscription ${subscriptionId}`,
          });

          await kickFromDiscord(user);
        }
        break;
      }

      // ─── Payment Cancelled (user cancelled a pending payment) ───
      case 'SUBSCRIPTION_PAYMENT_CANCELLED': {
        const user = await findUserBySub(data);
        if (user) {
          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'payment_failed',
            details: `Payment cancelled for subscription ${subscriptionId}`,
          });
        }
        break;
      }

      // ─── Subscription Cancelled ───
      case 'SUBSCRIPTION_CANCELLED': {
        const user = await findUserBySub(data);
        if (user) {
          user.subscriptionStatus = 'cancelled';
          await user.save();

          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'left_channel',
            details: 'Subscription cancelled',
          });

          await kickFromDiscord(user);
        }
        break;
      }

      // ─── Subscription Status Changed (main catch-all for status updates) ───
      case 'SUBSCRIPTION_STATUS_CHANGED': {
        const newStatus = (sub.subscription_status || data.subscription_status || data.status || '') as string;
        const user = await findUserBySub(data);

        console.log(`Subscription ${subscriptionId} status → ${newStatus}`);

        if (user) {
          const upper = newStatus.toUpperCase();
          if (['CANCELLED', 'EXPIRED', 'COMPLETED', 'PAUSED'].includes(upper)) {
            user.subscriptionStatus = upper === 'PAUSED' ? 'cancelled' : newStatus.toLowerCase();
            await user.save();

            await AuditLog.create({
              userId: user._id, userEmail: user.email,
              action: 'left_channel',
              details: `Subscription status changed to ${newStatus}`,
            });

            await kickFromDiscord(user);
          } else if (upper === 'ACTIVE') {
            user.subscriptionStatus = 'active';
            await user.save();

            await AuditLog.create({
              userId: user._id, userEmail: user.email,
              action: 'subscribed',
              details: `Subscription activated`,
            });
          }
        }
        break;
      }

      // ─── Auth Status (initial mandate/authorization) ───
      case 'SUBSCRIPTION_AUTH_STATUS': {
        const authStatus = (sub.authorization_status || data.authorization_status || '') as string;
        const user = await findUserBySub(data);

        console.log(`Subscription ${subscriptionId} auth status: ${authStatus}`);

        if (user) {
          if (authStatus.toUpperCase() === 'ACTIVE') {
            user.subscriptionStatus = user.subscriptionStatus === 'none' ? 'trial' : user.subscriptionStatus;
            await user.save();
          }

          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: authStatus.toUpperCase() === 'ACTIVE' ? 'subscribed' : 'payment_failed',
            details: `Subscription auth status: ${authStatus}`,
          });
        }
        break;
      }

      // ─── Card Expiry Reminder ───
      case 'SUBSCRIPTION_CARD_EXPIRY_REMINDER': {
        const user = await findUserBySub(data);
        if (user) {
          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'payment_failed',
            details: `Card expiry reminder sent for subscription ${subscriptionId}`,
          });
        }
        console.log(`Card expiry reminder for subscription ${subscriptionId}`);
        break;
      }

      // ─── Payment Notification Initiated (upcoming payment) ───
      case 'SUBSCRIPTION_PAYMENT_NOTIFICATION_INITIATED': {
        const user = await findUserBySub(data);
        if (user) {
          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'subscribed',
            details: `Payment notification initiated for subscription ${subscriptionId}`,
          });
        }
        console.log(`Payment notification initiated for subscription ${subscriptionId}`);
        break;
      }

      // ─── Refund Status ───
      case 'SUBSCRIPTION_REFUND_STATUS': {
        const refundStatus = (data.refund_status || sub.refund_status || '') as string;
        const user = await findUserBySub(data);

        console.log(`Refund status for subscription ${subscriptionId}: ${refundStatus}`);

        if (user) {
          await AuditLog.create({
            userId: user._id, userEmail: user.email,
            action: 'payment_failed',
            details: `Refund ${refundStatus} for subscription ${subscriptionId}`,
          });

          // If refund is successful, kick from Discord
          if (['SUCCESS', 'PROCESSED'].includes(refundStatus.toUpperCase())) {
            user.subscriptionStatus = 'cancelled';
            await user.save();
            await kickFromDiscord(user);
          }
        }
        break;
      }

      default:
        console.log('Unhandled webhook event:', eventType, JSON.stringify(data).slice(0, 200));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
