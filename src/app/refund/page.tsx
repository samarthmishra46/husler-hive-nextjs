export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-8 text-3xl font-bold text-white">Refund Policy</h1>
      <div className="space-y-6 text-gray-400 leading-relaxed">
        <p>
          We want you to be satisfied with your Hustlers Hive subscription. Please review our refund
          policy below.
        </p>

        <h2 className="text-xl font-semibold text-white">1. Free Trial</h2>
        <p>
          First-time subscribers receive a 7-day free trial. You may cancel during the trial period
          without being charged. No refund is needed for trial cancellations as no payment is collected.
        </p>

        <h2 className="text-xl font-semibold text-white">2. Subscription Refunds</h2>
        <p>
          Refund requests must be made within 48 hours of a payment being charged. After 48 hours,
          refunds will not be issued for the current billing period. You may cancel your subscription
          at any time to prevent future charges.
        </p>

        <h2 className="text-xl font-semibold text-white">3. How to Request a Refund</h2>
        <p>
          To request a refund, please contact us through our Discord server or send an email with
          your registered email address and subscription details. Refunds are typically processed
          within 5-7 business days.
        </p>

        <h2 className="text-xl font-semibold text-white">4. Non-Refundable Cases</h2>
        <p>
          Refunds will not be issued if your account was terminated due to violation of our terms of
          service, including sharing subscription content or account access.
        </p>

        <p className="text-sm text-gray-500 pt-4">
          Last updated: March 2026
        </p>
      </div>
    </div>
  );
}
