export default function PrivacyPage() {
  return (
    <div className="landing-section" style={{ paddingTop: '100px', minHeight: '80vh' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <p className="section-eyebrow">Legal</p>
        <h1 className="section-title">Privacy <span className="hl">Policy</span></h1>
        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <p className="section-body">
            At Hustlers Hive, we are committed to protecting your privacy. This policy outlines how we
            collect, use, and safeguard your information.
          </p>

          <div className="amenity-card">
            <h4 className="amenity-title">1. Information We Collect</h4>
            <p className="amenity-desc">
              We collect the following information when you subscribe: your email address, mobile number,
              and Discord account details. Payment information is processed securely by
              our payment partner Cashfree and is not stored on our servers.
            </p>
          </div>

          <div className="amenity-card">
            <h4 className="amenity-title">2. How We Use Your Information</h4>
            <p className="amenity-desc">
              Your information is used to manage your subscription, provide access to the private
              Discord channel, process payments, and communicate important updates about your account.
            </p>
          </div>

          <div className="amenity-card">
            <h4 className="amenity-title">3. Data Security</h4>
            <p className="amenity-desc">
              We implement appropriate security measures to protect your personal information. Your data
              is stored securely and is only accessible to authorized personnel.
            </p>
          </div>

          <div className="amenity-card">
            <h4 className="amenity-title">4. Third-Party Services</h4>
            <p className="amenity-desc">
              We use Discord for community access and Cashfree for payment processing. These services
              have their own privacy policies that govern the data they collect.
            </p>
          </div>

          <div className="amenity-card">
            <h4 className="amenity-title">5. Contact</h4>
            <p className="amenity-desc">
              If you have any questions about this privacy policy, please contact us through our Discord
              server or email.
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
