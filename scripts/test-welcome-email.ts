/**
 * One-off test for the Resend welcome email.
 * Run: npx tsx scripts/test-welcome-email.ts [recipient@example.com]
 *
 * Loads .env from the project root manually (Node 18 has no --env-file)
 * and renders the same template src/lib/email.ts uses, with a fake user.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resend } from 'resend';

// ── load .env ─────────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env');
const envText = readFileSync(envPath, 'utf8');
for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = value;
}

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hustlershive.club';
const to = process.argv[2] || 'msamarth607@gmail.com';

if (!apiKey) throw new Error('RESEND_API_KEY missing in .env');
if (!from)   throw new Error('RESEND_FROM_EMAIL missing in .env');

// ── fake user (matches the shape src/lib/email.ts reads) ──────────────────
const fakeUser = {
  email: to,
  cashfreeSubscriptionId: 'sub_TEST_' + Date.now(),
  plan: 'monthly' as const,
  subscriptionStatus: 'trial' as const,
};

const PLAN_LABELS = {
  monthly: { name: 'Monthly Membership', price: '₹4,999 / month' },
  quarterly: { name: '3-Month Bundle', price: '₹12,997 / 3 months' },
};

const verifyUrl = `${appUrl}/payment/verify?sub_id=${encodeURIComponent(fakeUser.cashfreeSubscriptionId)}`;
const plan = PLAN_LABELS[fakeUser.plan];
const trial = fakeUser.subscriptionStatus === 'trial';

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
        <tr><td style="padding: 4px 0; color: #6b6b8a;">Plan</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${plan.name}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b6b8a;">Price</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${plan.price}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b6b8a;">Status</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${trial ? 'Trial active' : 'Active'}</td></tr>
        <tr><td style="padding: 4px 0; color: #6b6b8a;">Subscription ID</td><td style="padding: 4px 0; text-align: right; font-family: ui-monospace, monospace; font-size: 0.8rem;">${fakeUser.cashfreeSubscriptionId}</td></tr>
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
      [TEST] This is a test email. Only one Discord account can be linked to this subscription.
    </p>
  </div>
`;

async function main() {
  console.log(`→ Sending test email`);
  console.log(`  from:  ${from}`);
  console.log(`  to:    ${to}`);
  console.log(`  link:  ${verifyUrl}`);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: from!,
    to,
    subject: '[TEST] Trial started — connect Discord to get access',
    html,
  });

  if (error) {
    console.error('\n[FAIL] Resend returned an error:');
    console.error(error);
    process.exit(1);
  }

  console.log('\n[OK] Resend accepted the email.');
  console.log('   message id:', data?.id);
  console.log('\nCheck the recipient inbox (and spam) within a minute or so.');
  console.log('If it does not arrive, check the Resend dashboard -> Logs for delivery status.');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
