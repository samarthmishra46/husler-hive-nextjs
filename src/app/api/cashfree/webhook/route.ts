import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Payment from '@/models/Payment';
import AuditLog from '@/models/AuditLog';
import { verifyWebhookSignature } from '@/lib/cashfree';
import { removeUserFromChannel, kickUserFromGuild } from '@/lib/discord';

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

    await dbConnect();

    switch (eventType) {
      case 'SUBSCRIPTION_PAYMENT_CHARGED':
      case 'PAYMENT_SUCCESS_WEBHOOK': {
        const subscriptionId =
          data.subscription?.subscription_id || data.subscription_id;
        const user = await User.findOne({ cashfreeSubscriptionId: subscriptionId });

        if (user) {
          user.subscriptionStatus = 'active';
          await user.save();

          await Payment.create({
            userId: user._id,
            cashfreeSubscriptionId: subscriptionId,
            amount: data.subscription?.amount || data.amount || 0,
            status: 'success',
            paidAt: new Date(),
            cfPaymentId: data.cf_payment_id || data.payment_id,
          });

          await AuditLog.create({
            userId: user._id,
            userEmail: user.email,
            action: 'payment_success',
            details: `Payment received for subscription ${subscriptionId}`,
          });
        }
        break;
      }

      case 'SUBSCRIPTION_PAYMENT_DECLINED':
      case 'PAYMENT_FAILED_WEBHOOK': {
        const subscriptionId =
          data.subscription?.subscription_id || data.subscription_id;
        const user = await User.findOne({ cashfreeSubscriptionId: subscriptionId });

        if (user) {
          user.subscriptionStatus = 'expired';
          await user.save();

          await Payment.create({
            userId: user._id,
            cashfreeSubscriptionId: subscriptionId,
            amount: data.subscription?.amount || data.amount || 0,
            status: 'failed',
            cfPaymentId: data.cf_payment_id || data.payment_id,
          });

          await AuditLog.create({
            userId: user._id,
            userEmail: user.email,
            action: 'payment_failed',
            details: `Payment failed for subscription ${subscriptionId}`,
          });

          // Kick from Discord if connected
          if (user.discordId && user.channelAdded) {
            try {
              await removeUserFromChannel(user.discordId);
              await kickUserFromGuild(user.discordId);
              user.channelAdded = false;
              user.leftAt = new Date();
              await user.save();

              await AuditLog.create({
                userId: user._id,
                userEmail: user.email,
                action: 'kicked',
                details: 'Kicked due to payment failure',
              });
            } catch (discordError) {
              console.error('Error kicking user from Discord:', discordError);
            }
          }
        }
        break;
      }

      case 'SUBSCRIPTION_CANCELLED': {
        const subscriptionId =
          data.subscription?.subscription_id || data.subscription_id;
        const user = await User.findOne({ cashfreeSubscriptionId: subscriptionId });

        if (user) {
          user.subscriptionStatus = 'cancelled';
          await user.save();

          await AuditLog.create({
            userId: user._id,
            userEmail: user.email,
            action: 'left_channel',
            details: 'Subscription cancelled',
          });

          // Kick from Discord
          if (user.discordId && user.channelAdded) {
            try {
              await removeUserFromChannel(user.discordId);
              await kickUserFromGuild(user.discordId);
              user.channelAdded = false;
              user.leftAt = new Date();
              await user.save();

              await AuditLog.create({
                userId: user._id,
                userEmail: user.email,
                action: 'kicked',
                details: 'Kicked due to subscription cancellation',
              });
            } catch (discordError) {
              console.error('Error kicking user from Discord:', discordError);
            }
          }
        }
        break;
      }

      default:
        console.log('Unhandled webhook event:', eventType);
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
