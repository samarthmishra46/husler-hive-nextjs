export default function TermsPage() {
  return (
    <div className="landing-section" style={{ paddingTop: '100px', minHeight: '80vh' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <p className="section-eyebrow">Legal</p>
        <h1 className="section-title">Terms &amp; <span className="hl">Conditions</span></h1>
        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <p className="section-body">
            By accessing and using Hustlers Hive, you agree to be bound by these Terms and Conditions.
          </p>

          <div className="amenity-card">
            <h4 className="amenity-title">1. Subscription</h4>
            <p className="amenity-desc">
              Hustlers Hive offers a subscription-based service that provides access to a private Discord
              channel with trading signals and insights. Your subscription begins upon successful payment
              and includes a 7-day free trial for first-time subscribers.
            </p>
          </div>

          <div className="amenity-card">
            <h4 className="amenity-title">2. Access</h4>
            <p className="amenity-desc">
              Access to the private Discord channel is granted upon successful subscription and Discord
              account connection. You must maintain an active subscription to retain access.
            </p>
          </div>

          <div className="amenity-card">
            <h4 className="amenity-title">3. Usage</h4>
            <p className="amenity-desc">
              The signals and information shared in the private channel are for educational and
              informational purposes only. They do not constitute financial advice.
            </p>
          </div>

          <div className="amenity-card">
            <h4 className="amenity-title">4. Account</h4>
            <p className="amenity-desc">
              You are responsible for maintaining the confidentiality of your account. Sharing your
              subscription access or redistributing content from the private channel is strictly
              prohibited and may result in immediate termination.
            </p>
          </div>

          <div className="amenity-card">
            <h4 className="amenity-title">5. Changes</h4>
            <p className="amenity-desc">
              We reserve the right to modify these terms at any time. Continued use of the service after
              changes constitutes acceptance of the updated terms.
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
