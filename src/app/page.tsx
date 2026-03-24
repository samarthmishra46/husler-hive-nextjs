'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import SubscribeForm from '@/components/SubscribeForm';

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [videoSlide, setVideoSlide] = useState(0);
  const [imgSlide, setImgSlide] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

const certificates = [
  {
    src: 'https://res.cloudinary.com/dqyizevct/image/upload/v1774345347/WhatsApp_Image_2026-03-23_at_1.18.39_PM_1_hddtkz.jpg',
    alt: 'Funded certificate display 1',
  },
  {
    src: 'https://res.cloudinary.com/dqyizevct/image/upload/v1774345349/WhatsApp_Image_2026-03-23_at_1.18.38_PM_1_ogxyjw.jpg',
    alt: 'Funded certificate display 2',
  },
  {
    src: 'https://res.cloudinary.com/dqyizevct/image/upload/v1774345349/WhatsApp_Image_2026-03-23_at_1.18.37_PM_drboiv.jpg',
    alt: 'Funded certificate display 3',
  },
  {
    src: 'https://res.cloudinary.com/dqyizevct/image/upload/v1774345347/WhatsApp_Image_2026-03-23_at_1.18.39_PM_2_bn9qwy.jpg',
    alt: 'Funded certificate display 4',
  },
  {
    src: 'https://res.cloudinary.com/dqyizevct/image/upload/v1774345347/WhatsApp_Image_2026-03-23_at_1.18.38_PM_w3lghp.jpg',
    alt: 'Funded certificate display 5',
  },
  {
    src: 'https://res.cloudinary.com/dqyizevct/image/upload/v1774345347/WhatsApp_Image_2026-03-23_at_1.18.40_PM_xdrnyk.jpg',
    alt: 'Funded certificate display 6',
  },
  {
    src: 'https://res.cloudinary.com/dqyizevct/image/upload/v1774345347/WhatsApp_Image_2026-03-23_at_1.18.39_PM_pyofbe.jpg',
    alt: 'Funded certificate display 7',
  },
];

  const fundedVideos = [
    { src: 'https://res.cloudinary.com/dqyizevct/video/upload/v1774345356/AQOCD33ALZx0j7GaMnkAYpVCsl7i07iXBbYhUdyXYeEyjfLcfpV6dHEh_6XfcGefWzzqbONkf_2BMn6mV467bKKcilQyPkyP3l2XdgE_xo1mnf.mp4'},
    { src: 'https://res.cloudinary.com/dqyizevct/video/upload/v1774345354/AQP1afm2A0mXNRaN0kLsHS9F6UlQY1WGFMJ299ftw2O9dotCwNNN08UC7PgIeSdHMpwUuEmkFpGsRydSuoQytTAqwxt6GjLtI--ohuo_a7vheo.mp4'},
    { src: 'https://res.cloudinary.com/dqyizevct/video/upload/v1774345357/AQPTkvzyjgU8lZbtup-5SJ5YVl0fcaVbDQOpea4W1Ls6mpWLAt5zJZnEP5q4zDsg386XqnWr4boEk0_WmVForPhKIfSm_VnGE_A5fOc_ryw8fe.mp4'},
  ];

  const handleVideoToggle = useCallback((index: number) => {
    const video = videoRefs.current[index];
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  const goToSlide = useCallback((dir: number) => {
    // pause current
    const curr = videoRefs.current[videoSlide];
    if (curr) curr.pause();
    setVideoSlide((prev) => {
      const next = prev + dir;
      if (next < 0) return fundedVideos.length - 1;
      if (next >= fundedVideos.length) return 0;
      return next;
    });
  }, [videoSlide, fundedVideos.length]);

  const goToImg = useCallback((dir: number) => {
    setImgSlide((prev) => {
      const next = prev + dir;
      if (next < 0) return certificates.length - 1;
      if (next >= certificates.length) return 0;
      return next;
    });
  }, [certificates.length]);

  // Auto-scroll images
  useEffect(() => {
    const timer = setInterval(() => {
      setImgSlide((prev) => (prev + 1) % certificates.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [certificates.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const problems = [
    { title: 'Following Random Tips', desc: 'Signal groups promise "sure-shot" calls. You lose ₹3 lakhs and realize it\'s all gambling.' },
    { title: 'No Time to Learn', desc: 'YouTube videos are 4 hours long. Your 9-5 job doesn\'t allow deep research on charts.' },
    { title: 'Don\'t Understand Patterns', desc: 'Candlestick patterns, support/resistance, trends... nothing sticks. You\'re memorizing, not learning.' },
    { title: 'Fake Courses', desc: 'Online courses promise riches. They deliver PowerPoints. No real trading education.' },
    { title: 'Trading Alone = Fear', desc: 'You panic exit profitable trades. You hold losing trades when emotion takes over.' },
    { title: 'Zero Mentorship', desc: 'No one to guide you. No one to explain. You\'re guessing on every trade.' },
  ];

  const timeline = [
    { time: '7:00 PM', title: 'Mentors Go Live', desc: 'SEBI-verified traders start analyzing charts. 200+ traders join live.' },
    { time: '7:05 PM', title: 'Same Setup', desc: 'Everyone trades the SAME entry. You execute alongside mentors. 200+ traders trading together.' },
    { time: '7:30 PM', title: 'Live Management', desc: 'Mentors manage the trade. You see EXACTLY how they exit. You exit the same way.' },
    { time: '7:55 PM', title: 'Learn the Lesson', desc: 'Trade closed. Mentors explain why it worked/failed. You learned ONE real trade.' },
  ];

  const features = [
    { icon: '📺', title: 'Live Community Trading (7-8 PM Daily)', desc: 'Trade the exact setups mentors trade. 200+ traders executing together. Real-time mentor guidance. Every trade documented & explained.', bullets: ['Real-time trade execution', 'Live mentor explanations', '200+ traders supporting you', 'Risk management taught live'] },
    { icon: '👥', title: 'Private Discord Community', desc: '200+ active traders. Pre-market analysis shared daily. Q&A with mentors same day.', bullets: ['Daily setups & trade plans', 'Member wins & losses shared', 'Transparency on all trades', 'Supportive trading community'] },
    { icon: '📹', title: 'Recorded Sessions Access', desc: 'Miss a session? Watch the recording. Full trade documentation. Study past trades anytime.', bullets: ['Lifetime access to recordings', 'Mentor explanations archived', 'Trade review anytime', 'Learn at your own pace'] },
    { icon: '🎓', title: 'Mentorship Support', desc: 'Ask questions during sessions. Discord support 2 PM - 11 PM IST. Trade review requests welcome.', bullets: ['Live Q&A during sessions', 'Daily Discord support', 'Personal trade reviews', 'Risk management coaching'] },
  ];

  const testimonials = [
    { quote: 'I was trading alone. Lost ₹3 lakhs. Joined Hustler\'s Hive and started trading with mentors in the 7 PM session. Seeing professionals trade the exact setup you\'re trading changes everything. Now I make ₹80K monthly. Not lucky. Skilled.', name: 'Amit P.', detail: 'Delhi | IT Professional (4 months)' },
    { quote: 'The magic is community trading. You\'re not watching YouTube. You\'re not following signals. You\'re literally trading the SAME entry/exit as 200+ other traders AND the mentors. It\'s real. It\'s live. It works.', name: 'Priya S.', detail: 'Bangalore | Finance Executive (2 months)' },
    { quote: 'Every night 7-8 PM, mentors enter a trade, I enter the same trade. I see how they exit. I exit same way. After 30 days, I stopped losing. After 60 days, I made ₹1.5L. This is the only way to learn professionally.', name: 'Rohan K.', detail: 'Mumbai | Business Owner (3 months)' },
  ];

  const differentiators = [
    { icon: '🎯', title: 'Community Trading, Not Signal Groups', desc: 'We don\'t send you tips. 200+ traders trade the EXACT SAME setups as mentors. You\'re not following signals. You\'re trading alongside professionals.' },
    { icon: '⏰', title: 'Real-Time, Not Recorded', desc: 'No pre-recorded videos. No theory. Live trading happens 7-8 PM. You see it. You do it. You learn it. Same night.' },
    { icon: '✅', title: 'SEBI Verified Mentors', desc: 'Real professional traders. Not influencers. Not course sellers. Actual traders who manage real money daily.' },
    { icon: '🛡️', title: 'Risk Management Taught Through Experience', desc: 'We don\'t lecture about risk. You LIVE it. Every trade you take with mentors, you see: entry, stop loss, exit. You learn how professionals protect capital.' },
    { icon: '👥', title: '200+ Traders Doing It Together', desc: 'You\'re not trading alone anymore. 200+ community members making the same decisions. Same entries. Same exits. Same learning curve.' },
    { icon: '💰', title: 'Affordable & Accessible', desc: '₹4,999/month for unlimited live sessions, mentorship, and community. No hidden fees. No upselling.' },
  ];

  const faqs = [
    { q: 'I\'ve never traded before. Can I join?', a: 'Absolutely! Our sessions are designed for beginners and experienced traders alike. Mentors explain every setup in real-time, and you\'ll be trading alongside 200+ community members who support each other.' },
    { q: 'I have a full-time job. Will I have time?', a: 'Yes! Our live sessions run from 7-8 PM IST (NY session), which is after working hours for most people. It\'s just 1 hour per day. Plus, all sessions are recorded so you can review them anytime.' },
    { q: 'Is this guaranteed to make me money?', a: 'No honest trading education can guarantee profits. Markets involve risk. What we guarantee is real mentorship, real community trading, and a structured approach that has helped 200+ traders improve their skills significantly.' },
    { q: 'How long before I see results?', a: 'Most members report noticeable improvement within 30 days. By 60-90 days, members who follow the process consistently typically see meaningful trading results.' },
    { q: 'What if I lose money?', a: 'Every trade includes strict risk management. Mentors teach you position sizing and stop-loss placement live. You\'ll learn to manage risk before chasing profits.' },
    { q: 'Can I watch recordings if I miss a session?', a: 'Yes! Every live session is recorded and available in our library. You get lifetime access to all recordings as a member.' },
    { q: 'Is the free trial really free?', a: 'Yes, 100% free. No credit card required. Join one live session, see the community in action, and decide if it\'s right for you.' },
  ];

  return (
    <>
      {/* HERO */}
      <section id="hero">
        <div className="hero-dots"></div>
        <div className="hero-blob1"></div>
        <div className="hero-blob2"></div>
        <span className="hero-tag">Live Trading · 7-8 PM IST · Tonight</span>
        <h1 className="hero-title">
          Trade Exactly Like<br />
          Your <span className="highlight">Mentors</span> Do.
        </h1>
        <p className="hero-sub" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--purple)', marginTop: '12px' }}>
          Live. Tonight. 7-8 PM.
        </p>
        <p className="hero-sub" style={{ marginTop: '8px' }}>
          200+ traders trading together. Same setups. Same entries. Same exits.
          You watch. You learn. You trade with them.
        </p>
        <div className="hero-stats">
          <div>
            <div className="hero-stat-val">200+</div>
            <div className="hero-stat-label">Traders Trading Together</div>
          </div>
          <div>
            <div className="hero-stat-val">₹50K-₹2L+</div>
            <div className="hero-stat-label">Monthly Income (Members)</div>
          </div>
          <div>
            <div className="hero-stat-val">Tonight 7-8 PM</div>
            <div className="hero-stat-label">NY Session (Live)</div>
          </div>
        </div>
        <div className="hero-actions" style={{ marginTop: '40px' }}>
          <button onClick={() => setShowForm(true)} className="btn-primary btn-lg">
            JOIN TONIGHT&apos;S LIVE SESSION
          </button>
        </div>
      </section>

      <div className="divider"></div>

      {/* PROBLEM SECTION */}
      <section id="problems" className="landing-section">
        <div className="reveal" style={{ maxWidth: '720px', marginBottom: '52px' }}>
          <p className="section-eyebrow">The Problem</p>
          <h2 className="section-title">
            You&apos;re Trading Alone.<br />
            That&apos;s Why You&apos;re <span className="hl">Losing.</span>
          </h2>
          <p className="section-body">
            Sound familiar? You&apos;re not alone. Most traders struggle with the same problems.
          </p>
        </div>
        <div className="problems-grid reveal">
          {problems.map((p, i) => (
            <div key={i} className="problem-card">
              <div className="problem-x">❌</div>
              <div className="problem-title">{p.title}</div>
              <p className="problem-desc">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="timeline-cta reveal  ">
          <h3>The Real Problem:</h3>
          <p>
            You don&apos;t have a mentor trading ALONGSIDE you. You don&apos;t have 200+ other traders
            making the SAME decisions. You&apos;re not seeing professional trading happen in real-time.
          </p>
        </div>
      </section>

      <div className="divider"></div>

      {/* HOW IT WORKS */}
      <section id="how" className="landing-section">
        <div className="reveal" style={{ maxWidth: '720px', marginBottom: '52px' }}>
          <p className="section-eyebrow">How It Works</p>
          <h2 className="section-title">
            How Community Trading<br />
            <span className="hl">Actually Works</span>
          </h2>
          <p className="section-body">The NY Session Model (7 PM - 8 PM IST)</p>
        </div>
        <div className="timeline reveal">
          {timeline.map((item, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-step">{i + 1}</div>
              <div className="timeline-content">
                <div className="timeline-time">{item.time}</div>
                <h4 className="timeline-title">{item.title}</h4>
                <p className="timeline-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="timeline-cta reveal">
          <h3>By Next Month, You&apos;ll Have Done 20 Real Trades</h3>
          <p>You&apos;re not reading about trading. You&apos;re DOING it. With mentors. With community. Every single night.</p>
        </div>
      </section>

      <div className="divider"></div>

      {/* FEATURES */}
      <section id="features" className="landing-section">
        <div className="reveal" style={{ textAlign: 'center', marginBottom: '52px' }}>
          <p className="section-eyebrow">What You Get</p>
          <h2 className="section-title">
            What Happens When You Join<br />
            <span className="hl">Hustler&apos;s Hive</span>
          </h2>
        </div>
        <div className="features-grid reveal">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h4 className="feature-title">{f.title}</h4>
              <p className="feature-desc">{f.desc}</p>
              <ul className="feature-bullets">
                {f.bullets.map((b, j) => (
                  <li key={j}><span className="feat-dot">✓</span> {b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="divider"></div>

      {/* TRUST STATS */}
      <section id="trust" className="landing-section" style={{ background: 'var(--white)', textAlign: 'center' }}>
        <div className="reveal">
          <p className="section-eyebrow">Social Proof</p>
          <h2 className="section-title">Trusted by <span className="hl">200+ Traders</span></h2>
        </div>
        <div className="trust-stats reveal">
          <div className="trust-stat">
            <div className="trust-val">200+</div>
            <div className="trust-label">Active Traders</div>
          </div>
          <div className="trust-stat">
            <div className="trust-val">₹50K-₹2L</div>
            <div className="trust-label">Monthly Income</div>
          </div>
          <div className="trust-stat">
            <div className="trust-val">7/10</div>
            <div className="trust-label">Trade Profitably</div>
          </div>
          <div className="trust-stat">
            <div className="trust-val">4.9/5</div>
            <div className="trust-label">Member Rating</div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="landing-section">
        <div className="reveal" style={{ textAlign: 'center', marginBottom: '52px' }}>
          <p className="section-eyebrow">Testimonials</p>
          <h2 className="section-title">What Members <span className="hl">Say</span></h2>
        </div>
        <div className="testimonials-grid reveal">
          {testimonials.map((t, i) => (
            <div key={i} className="testimonial-card">
              <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
              <div className="testimonial-author">
                <div className="testimonial-name">{t.name}</div>
                <div className="testimonial-detail">{t.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider"></div>

      {/* FUNDED VIDEOS */}
      <section id="funded-videos" className="landing-section" style={{ background: 'var(--white)' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: '36px' }}>
          <p className="section-eyebrow">Success Stories</p>
          <h2 className="section-title">
            Our Members Got <span className="hl">Funded</span>
          </h2>
          <p className="section-body" style={{ margin: '0 auto' }}>
            Real traders. Real funded accounts. Watch their stories.
          </p>
        </div>
        <div className="video-carousel reveal">
          <button className="video-nav video-prev" onClick={() => goToSlide(-1)} aria-label="Previous video">
            ‹
          </button>
          <div className="video-phone-frame">
            {fundedVideos.map((v, i) => (
              <div
                key={i}
                className={`video-slide ${i === videoSlide ? 'active' : ''}`}
              >
                <video
                  ref={(el) => { videoRefs.current[i] = el; }}
                  src={v.src}
                  playsInline
                  loop
                  muted
                  preload="metadata"
                  onClick={() => handleVideoToggle(i)}
                  className="video-player"
                />
                <div className="video-overlay" onClick={() => handleVideoToggle(i)}>
                  <div className="video-play-icon">▶</div>
                </div>
               
              </div>
            ))}
          </div>
          <button className="video-nav video-next" onClick={() => goToSlide(1)} aria-label="Next video">
            ›
          </button>
        </div>
        <div className="video-dots">
          {fundedVideos.map((_, i) => (
            <button
              key={i}
              className={`video-dot ${i === videoSlide ? 'active' : ''}`}
              onClick={() => {
                const curr = videoRefs.current[videoSlide];
                if (curr) curr.pause();
                setVideoSlide(i);
              }}
              aria-label={`Go to video ${i + 1}`}
            />
          ))}
        </div>
      </section>

      <div className="divider"></div>

      {/* CERTIFICATES & PHOTOS */}
      <section id="certificates" className="landing-section">
        <div className="reveal" style={{ textAlign: 'center', marginBottom: '36px' }}>
          <p className="section-eyebrow">The Proof</p>
          <h2 className="section-title">
            Real People. <span className="hl">Real Results.</span>
          </h2>
          <p className="section-body" style={{ margin: '0 auto' }}>
            Scroll through our members achieving their funded goals.
          </p>
        </div>
        <div className="img-carousel reveal">
          <button className="video-nav" onClick={() => goToImg(-1)} aria-label="Previous image">
            ‹
          </button>
          <div className="img-carousel-frame">
            {certificates.map((cert, i) => (
              <div
                key={i}
                className={`img-slide ${i === imgSlide ? 'active' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cert.src} alt={cert.alt} className="img-player" />
              </div>
            ))}
          </div>
          <button className="video-nav" onClick={() => goToImg(1)} aria-label="Next image">
            ›
          </button>
        </div>
        <div className="video-dots reveal" style={{ marginTop: '20px' }}>
          {certificates.map((_, i) => (
            <button
              key={i}
              className={`video-dot ${i === imgSlide ? 'active' : ''}`}
              onClick={() => setImgSlide(i)}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      </section>

      <div className="divider"></div>

      {/* PRICING */}
      <section id="pricing" className="landing-section">
        <div className="reveal" style={{ textAlign: 'center', marginBottom: '52px' }}>
          <p className="section-eyebrow">Membership</p>
          <h2 className="section-title">
            Simple, <span className="hl">Transparent</span> Pricing
          </h2>
          <p className="section-body" style={{ margin: '0 auto' }}>
            Choose the plan that works for you. No hidden fees. Cancel anytime.
          </p>
        </div>
        <div className="pricing-grid reveal">
          {/* Free Trial */}
          <div className="price-card">
            <div className="price-card-name">Free Trial</div>
            <div className="price-card-amount">₹0</div>
            <div className="price-card-period">/1 Session</div>
            <ul className="price-card-features">
              <li><span className="feat-dot">✓</span> 1 Free Live Session</li>
              <li><span className="feat-dot">✓</span> Access Community Chat</li>
              <li><span className="feat-dot">✓</span> See How It Works</li>
              <li><span className="feat-dot">✓</span> No Credit Card Required</li>
            </ul>
            <button onClick={() => setShowForm(true)} className="btn-outline price-card-btn">
              Start Free Trial
            </button>
          </div>

          {/* Monthly */}
          <div className="price-card price-card-featured">
            <div className="pricing-badge">Most Popular</div>
            <div className="price-card-name">Monthly Membership</div>
            <div className="price-card-amount">₹4,999</div>
            <div className="price-card-period">/month</div>
            <ul className="price-card-features">
              <li><span className="feat-dot">✓</span> Unlimited Live Sessions</li>
              <li><span className="feat-dot">✓</span> Private Discord Access</li>
              <li><span className="feat-dot">✓</span> Recorded Sessions Library</li>
              <li><span className="feat-dot">✓</span> 24/7 Mentor Support</li>
              <li><span className="feat-dot">✓</span> Trade Reviews</li>
            </ul>
            <button onClick={() => setShowForm(true)} className="btn-primary price-card-btn">
              Join Monthly
            </button>
          </div>

          {/* 3-Month Bundle */}
          <div className="price-card">
            <div className="price-card-name">3-Month Bundle</div>
            <div className="price-card-amount">₹12,997</div>
            <div className="price-card-period">Save 15% (₹14,997)</div>
            <ul className="price-card-features">
              <li><span className="feat-dot">✓</span> Unlimited Live Sessions</li>
              <li><span className="feat-dot">✓</span> Private Discord Access</li>
              <li><span className="feat-dot">✓</span> Recorded Sessions Library</li>
              <li><span className="feat-dot">✓</span> 24/7 Mentor Support</li>
              <li><span className="feat-dot">✓</span> Personal Trade Reviews</li>
              <li><span className="feat-dot">✓</span> Best for Serious Traders</li>
            </ul>
            <button onClick={() => setShowForm(true)} className="btn-primary price-card-btn">
              Get Bundle
            </button>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* DIFFERENTIATORS */}
      <section id="different" className="landing-section" style={{ background: 'var(--white)' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: '52px' }}>
          <p className="section-eyebrow">Why Us</p>
          <h2 className="section-title">
            We&apos;re Different. We Trade <span className="hl">TOGETHER.</span>
          </h2>
        </div>
        <div className="diff-grid reveal">
          {differentiators.map((d, i) => (
            <div key={i} className="diff-card">
              <span className="diff-icon">{d.icon}</span>
              <h4 className="diff-title">{d.title}</h4>
              <p className="diff-desc">{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="divider"></div>

      {/* FOUNDERS SECTION */}
      <section id="founders" className="landing-section">
        <div className="reveal" style={{ textAlign: 'center', marginBottom: '52px' }}>
          <p className="section-eyebrow">The Team</p>
          <h2 className="section-title">
            Built by <span className="hl">Traders,</span> for Traders
          </h2>
        </div>
        <div className="founders-grid reveal">
          {/* Bharath */}
          <div className="founder-card">
            <img 
              src="https://ui-avatars.com/api/?name=Bharath+Thangadurai&size=240&background=7c3aed&color=fff&bold=true" 
              alt="Bharath Thangadurai" 
              className="founder-img" 
            />
            <h3 className="founder-name">Bharath Thangadurai</h3>
            <div className="founder-title">Founder, Lead Trader</div>
            <div className="founder-content">
              <p>Most 19-year-olds are asking their parents for permission. Bharath left home at 18. No safety net. No mentor. No rich family backing his bets.</p>
              <p>Just a screen, a market, and an obsession that most people would have quit in month two. He didn&apos;t announce a strategy. He didn&apos;t sell a course. He didn&apos;t build a following by promising things he hadn&apos;t done himself.</p>
              <p>He just started posting every single trade. Live. On X. Every entry. Every exit. Every win that felt obvious in hindsight. And every loss — posted the same day it happened. No silence. No spin. No &quot;here&apos;s why the market was wrong.&quot;</p>
              <p>Just: this is what happened today.</p>
              <p>Over 2025, trade by trade, that record compounded to over 150% return on NQ futures. Not in a backtest. Not in a spreadsheet someone emailed you. You can go look right now. It&apos;s all there. Every day. That&apos;s not marketing. That&apos;s a paper trail.</p>
              <p>The trade floor exists because Bharath got tired of a space where everyone shows highlights and nobody shows the full game.</p>
              <p>He wanted a room where people could watch real decisions get made — under pressure, in real time — without anyone hiding behind edited screenshots. That room is Hustler&apos;s Hive.</p>
              <p>He still trades every session. You&apos;ll watch every move.</p>
            </div>
          </div>

          {/* Ganesh */}
          <div className="founder-card">
            <img 
              src="https://ui-avatars.com/api/?name=Ganesh+Selvaraj&size=240&background=c026d3&color=fff&bold=true" 
              alt="Ganesh Selvaraj" 
              className="founder-img" 
            />
            <h3 className="founder-name">Ganesh Selvaraj</h3>
            <div className="founder-title">Co-Founder & Performance Coach</div>
            <div className="founder-content">
              <p>Ganesh Selvaraj is a performance coach and co-founder of Hustler&apos;s Hive. He doesn&apos;t teach chart patterns. He doesn&apos;t call entries or exits. What he does is harder — and rarer.</p>
              <p>For over five years, Ganesh has worked with high-performing individuals on the problems that sit underneath the performance. The psychology that quietly unravels after a bad week. The decisions that deteriorate at 8 PM after a 10-hour day. The routines that look solid on paper but collapse the moment real pressure arrives.</p>
              <p>His work is split across two things: mindset and structure. Not one or the other. Both. Because in his experience, fixing one without the other doesn&apos;t hold.</p>
              <p>He&apos;s spent five years watching capable, disciplined people underperform — not because they lacked knowledge, but because they lacked an environment and a process that could actually support execution. That pattern is what brought him to Hustler&apos;s Hive.</p>
              <p>Inside the community, Ganesh works with members on how they respond to losses, how they manage the psychological weight of a drawdown, and how they build a daily structure that doesn&apos;t depend on motivation to function. He sits in the room. He watches. He has the conversations most coaches avoid.</p>
              <p>His approach is direct and specific. No frameworks that sound good in a seminar and fall apart in real life. No generic advice recycled from every trading psychology book that exists. Just honest, practical work on the exact things that are breaking down — and why.</p>
              <p>The trade floor works because the trading is transparent. Ganesh&apos;s role works because the coaching is equally transparent. Nothing hidden. Nothing dressed up. Just the work.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* FAQ */}
      <section id="faq" className="landing-section">
        <div className="faq-container">
          <div className="reveal">
            <p className="section-eyebrow">FAQ</p>
            <h2 className="section-title">
              Common<br />
              <span className="hl">Questions</span>
            </h2>
          </div>
          <div className="faq-list reveal">
            {faqs.map((faq, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                <button className="faq-q" onClick={() => toggleFaq(i)}>
                  {faq.q} <span className="faq-icon">+</span>
                </button>
                <div className="faq-a">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* FINAL CTA */}
      <section id="cta">
        <p className="section-eyebrow">Tonight</p>
        <h2 className="section-title" style={{ maxWidth: '700px', margin: '0 auto 16px' }}>
          Join Tonight&apos;s Trading Session.<br />
          <span className="hl" style={{ WebkitTextFillColor: '#fff', background: 'none' }}>7 PM IST.</span>
        </h2>
        <p className="section-body">
          Mentors are setting up. 200+ traders are joining. A high-probability NY session setup is coming.
        </p>
        <button onClick={() => setShowForm(true)} className="btn-white btn-lg" style={{ marginTop: '8px' }}>
          JOIN TONIGHT&apos;S LIVE TRADING SESSION
        </button>
        <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', maxWidth: '520px', margin: '20px auto 0' }}>
          Free for first session • No payment. No card required. • Trade alongside mentors • 200+ traders entering together
        </p>
      </section>

      {/* Subscribe Modal */}
      {showForm && <SubscribeForm onClose={() => setShowForm(false)} />}
    </>
  );
}
