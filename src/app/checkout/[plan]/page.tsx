import { redirect } from 'next/navigation';
import Link from 'next/link';
import CheckoutForm from '@/components/CheckoutForm';
import { getPlan } from '@/lib/plans';

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ plan: string }>;
}) {
  const { plan } = await params;
  const planDef = getPlan(plan);

  // Unknown plan key → back to the plan grid.
  if (!planDef) redirect('/');

  return (
    <main className="checkout-page">
      <div className="checkout-card">
        <Link href="/" className="checkout-logo">Hustler&apos;s Hive</Link>
        <h1 className="checkout-title">
          {planDef.billing === 'recurring' ? 'Start your membership' : 'Complete your purchase'}
        </h1>
        <p className="checkout-sub">Enter your details to continue</p>
        <CheckoutForm plan={planDef.key} />
      </div>
    </main>
  );
}
