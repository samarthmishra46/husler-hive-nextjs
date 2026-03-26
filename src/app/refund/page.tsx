export default function RefundPage() {
  return (
    <div className="landing-section" style={{ paddingTop: '100px', minHeight: '80vh' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <p className="section-eyebrow">Legal</p>
        <h1 className="section-title">Refund <span className="hl">Policy</span></h1>
        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <p className="section-body">
            We want you to be satisfied with your Hustlers Hive subscription. Please review our refund
            policy below.
          </p>

          <div className="amenity-card">
            <h4 className="amenity-title">1. Free Trial</h4>
            <p className="amenity-desc">
              First-time subscribers receive a 7-day free trial. You may cancel during the trial period
              without being charged. No refund is needed for trial cancellations.
            </p>
          </div>

          <div className="amenity-card">
            <h4 className="amenity-title">2. Subscription Refunds</h4>
            <p className="amenity-desc">
              Refund requests must be made within 48 hours of a payment being charged. After 48 hours,
              refunds will not be issued for the current billing period. You may cancel your subscription
              at any time to prevent future charges.
            </p>
          </div>

          <div className="amenity-card">
            <h4 className="amenity-title">3. How to Request a Refund</h4>
            <p className="amenity-desc">
              To request a refund, please contact us through our Discord server or send an email with
              your registered email address and subscription details. Refunds are typically processed
              within 5-7 business days.
            </p>
          </div>

          <div className="amenity-card">
            <h4 className="amenity-title">4. Non-Refundable Cases</h4>
            <p className="amenity-desc">
              Refunds will not be issued if your account was terminated due to violation of our terms of
              service, including sharing subscription content or account access.
            </p>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', paddingTop: '8px' }}>
            Last updated: March 2026
          </p>
        </div>
      </div>
    </div>
  );
}
