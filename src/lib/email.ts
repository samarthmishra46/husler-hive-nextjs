import { Resend } from 'resend';
import type { IUserDocument } from '@/models/User';
import { getPlan } from '@/lib/plans';
import { APP_URL } from '@/lib/appUrl';

const resend = new Resend(process.env.RESEND_API_KEY);

// Legacy keys kept so emails for older rows still render a label.
const LEGACY_PLAN_LABELS: Record<string, { name: string; price: string }> = {
  monthly: { name: 'Monthly Membership', price: '₹4,999 / month' },
  quarterly: { name: '3-Month Bundle', price: '₹12,997 / 3 months' },
};

function planLabel(planKey?: string): { name: string; price: string } {
  const def = planKey ? getPlan(planKey) : undefined;
  if (def) return { name: def.name, price: `${def.priceLabel} ${def.period}` };
  if (planKey && LEGACY_PLAN_LABELS[planKey]) return LEGACY_PLAN_LABELS[planKey];
  return { name: 'Membership', price: '' };
}

/**
 * Send the post-payment welcome email — payment summary + the verify URL
 * so the user can return later to connect Discord if they close the tab.
 *
 * Idempotent: returns immediately if `user.welcomeEmailSent` is already true.
 * Sets the flag (and saves) on successful send so retries from other webhook
 * events don't re-email.
 */
export async function sendWelcomeEmailIfNeeded(user: IUserDocument): Promise<void> {
  if (user.welcomeEmailSent) {
    console.log(`[email] skip welcome (already sent) → ${user.email} sub=${user.cashfreeSubscriptionId}`);
    return;
  }
  // Subscriptions verify by sub_id; one-time orders by order_id. Need at least one.
  const referenceId = user.cashfreeSubscriptionId || user.cashfreeOrderId;
  if (!referenceId) {
    console.log(`[email] skip welcome (no subscription/order id) → ${user.email}`);
    return;
  }
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.warn('[email] Resend env vars missing — skipping welcome email');
    return;
  }

  const verifyUrl = user.cashfreeSubscriptionId
    ? `${APP_URL}/payment/verify?sub_id=${encodeURIComponent(user.cashfreeSubscriptionId)}`
    : `${APP_URL}/payment/verify?order_id=${encodeURIComponent(user.cashfreeOrderId!)}`;
  const plan = planLabel(user.plan);
  const trial = user.subscriptionStatus === 'trial';

  const html = `
    <div style="font-family: Inter, -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #fff; color: #1a1a2e;">
      <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0 0 8px;">
        Payment ${trial ? 'authorized' : 'received'} 🎉
      </h2>
      <p style="color: #6b6b8a; font-size: 0.95rem; margin: 0 0 24px;">
        Welcome to Hustler's Hive. ${trial
          ? 'Your 7-day free trial has started — you will only be charged after the trial ends.'
          : 'Your subscription is now active.'}
      </p>

      <div style="border: 1px solid #ececf3; border-radius: 12px; padding: 20px; margin: 0 0 28px;">
        <div style="font-size: 0.75rem; font-weight: 600; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
          Payment summary
        </div>
        <table style="width: 100%; font-size: 0.9rem; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #6b6b8a;">Plan</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600;">${plan.name}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b6b8a;">Price</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600;">${plan.price}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b6b8a;">Status</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600;">${trial ? 'Trial active' : 'Active'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b6b8a;">Reference ID</td>
            <td style="padding: 4px 0; text-align: right; font-family: ui-monospace, monospace; font-size: 0.8rem;">${referenceId}</td>
          </tr>
        </table>
      </div>

      <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 8px;">Next step — connect Discord</h3>
      <p style="color: #6b6b8a; font-size: 0.92rem; margin: 0 0 20px;">
        Open the link below and connect your Discord account to get access to the private signals channel. This link is personal to your subscription — keep it safe.
      </p>
      <a href="${verifyUrl}"
        style="display: inline-block; padding: 14px 28px; background: #7c3aed; color: #fff;
               border-radius: 10px; font-weight: 700; font-size: 0.95rem; text-decoration: none;">
        Connect Discord →
      </a>
      <p style="margin-top: 18px; font-size: 0.82rem; color: #6b6b8a; word-break: break-all;">
        Or copy this URL: <a href="${verifyUrl}" style="color: #7c3aed;">${verifyUrl}</a>
      </p>

      <p style="margin-top: 32px; font-size: 0.75rem; color: #a0a0b8;">
        Only one Discord account can be linked to this subscription. If you have questions, reply to this email.
      </p>
    </div>
  `;

  console.log(`[email] sending welcome → ${user.email} ref=${referenceId} plan=${user.plan || 'unknown'} status=${user.subscriptionStatus}`);

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: user.email,
      subject: trial
        ? "Trial started — connect Discord to get access"
        : "Payment received — connect Discord to get access",
      html,
    });

    if (error) {
      console.error(`[email] Resend rejected send → ${user.email}:`, error);
      return; // don't set the flag — let a later webhook retry
    }

    user.welcomeEmailSent = true;
    await user.save();
    console.log(`[email] welcome sent ✓ to=${user.email} sub=${user.cashfreeSubscriptionId} resend_id=${data?.id}`);
  } catch (err) {
    console.error(`[email] send threw for ${user.email}:`, err);
  }
}
