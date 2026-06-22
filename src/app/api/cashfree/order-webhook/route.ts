import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Payment from '@/models/Payment';
import AuditLog from '@/models/AuditLog';
import { verifyOrderWebhookSignature } from '@/lib/cashfree';
import { sendWelcomeEmailIfNeeded } from '@/lib/email';
import { getPlan } from '@/lib/plans';
import type { PlanKey } from '@/lib/plans';

// ─── One-time order webhook (Cashfree PG) ───────────────────
// Handles single-charge products. These buyers are paid-in-advance, so they get
// `lifetime: true` and a permanent 'active' status — the cron + subscription
// expiry logic must never kick them.

interface OrderData {
  order?: { order_id?: string; order_amount?: number; order_tags?: { plan?: string } };
  payment?: { cf_payment_id?: string; payment_status?: string; payment_amount?: number };
  customer_details?: { customer_email?: string; customer_phone?: string };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature') || '';
    const timestamp = request.headers.get('x-webhook-timestamp') || '';

    if (process.env.CASHFREE_SECRET_KEY && signature && timestamp) {
      const isValid = verifyOrderWebhookSignature(timestamp, rawBody, signature);
      if (!isValid) {
        console.error('[OrderWebhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType: string = payload.type || '';
    const data = (payload.data || {}) as OrderData;

    const orderId = data.order?.order_id || '';
    const planKey = (data.order?.order_tags?.plan || '') as string;
    const email = String(data.customer_details?.customer_email || '').toLowerCase().trim();
    const phone = String(data.customer_details?.customer_phone || '').trim();
    const cfPaymentId = String(data.payment?.cf_payment_id || '');
    const amount = Number(data.payment?.payment_amount || data.order?.order_amount || 0);

    console.log(`[OrderWebhook] ${eventType} | order: ${orderId} | plan: ${planKey}`);

    await dbConnect();

    switch (eventType) {
      case 'PAYMENT_SUCCESS_WEBHOOK': {
        if (!email) {
          console.error(`[OrderWebhook] no customer_email for order=${orderId}`);
          break;
        }

        const plan = getPlan(planKey);
        const storedPlan: PlanKey | undefined =
          plan && plan.billing === 'onetime' ? plan.key : undefined;

        // Find existing user by order id or email, else create.
        let user =
          (await User.findOne({ cashfreeOrderId: orderId })) ||
          (await User.findOne({ email }));

        if (user) {
          user.cashfreeOrderId = orderId;
          if (phone) user.mobile = phone;
          if (storedPlan) user.plan = storedPlan;
          user.subscriptionStatus = 'active';
          user.lifetime = true;
          await user.save();
        } else {
          user = await User.create({
            email,
            mobile: phone || 'unknown',
            cashfreeOrderId: orderId,
            subscriptionStatus: 'active',
            lifetime: true,
            trialUsed: false,
            channelAdded: false,
            plan: storedPlan,
          });
        }

        if (cfPaymentId) {
          const exists = await Payment.findOne({ cfPaymentId });
          if (!exists) {
            await Payment.create({
              userId: user._id,
              cashfreeSubscriptionId: orderId, // reuse field as the Cashfree reference id
              amount,
              status: 'success',
              paidAt: new Date(),
              cfPaymentId,
            });
          }
        }

        await AuditLog.create({
          userId: user._id,
          userEmail: user.email,
          action: 'payment_success',
          details: `One-time payment ₹${amount} for ${planKey || 'unknown plan'}`,
        });

        await sendWelcomeEmailIfNeeded(user);
        break;
      }

      case 'PAYMENT_FAILED_WEBHOOK': {
        const user = await User.findOne({ cashfreeOrderId: orderId }) || (email ? await User.findOne({ email }) : null);
        if (user) {
          await Payment.create({
            userId: user._id,
            cashfreeSubscriptionId: orderId,
            amount,
            status: 'failed',
            cfPaymentId,
          });
          await AuditLog.create({
            userId: user._id,
            userEmail: user.email,
            action: 'payment_failed',
            details: `One-time payment failed for ${planKey || 'unknown plan'}`,
          });
        }
        break;
      }

      default:
        console.log(`[OrderWebhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[OrderWebhook] Error:', error);
    return NextResponse.json({ success: true });
  }
}
