import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MOBILE_CSS = `
  @media (max-width: 768px) {
    .nav-links { display: none !important; }

    .hero-section { padding: 6rem 1.5rem 3rem !important; min-height: unset !important; }
    .hero-h1 { font-size: clamp(2rem, 8vw, 3.75rem) !important; }
    .hero-buttons { flex-direction: column !important; align-items: stretch !important; }
    .hero-btn { text-align: center !important; }

    .process-grid { grid-template-columns: 1fr !important; }
    .process-step-0,
    .process-step-1 { border-right: none !important; border-bottom: 1px solid #1E1E1C !important; }

    .findings-grid { grid-template-columns: 1fr !important; }

    .pricing-grid { grid-template-columns: 1fr !important; }

    .manual-audit { flex-direction: column !important; align-items: flex-start !important; }
    .manual-audit-btn { width: 100% !important; text-align: center !important; box-sizing: border-box !important; }

    .footer { flex-direction: column !important; align-items: center !important; text-align: center !important; }
    .footer-links { justify-content: center !important; }

    .section-pad { padding: 3.5rem 1.5rem !important; }
  }
`

export default function Landing() {
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistDone, setWaitlistDone] = useState(false)
  const [waitlistError, setWaitlistError] = useState('')
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistFocused, setWaitlistFocused] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactSent, setContactSent] = useState(false)

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.email) return
    try {
      await fetch('https://formspree.io/f/xwvdvzbp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: contactForm.name, email: contactForm.email, message: contactForm.message })
      })
      setContactSent(true)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleWaitlist(e) {
    e.preventDefault()
    setWaitlistError('')
    setWaitlistLoading(true)
    const { error } = await supabase.from('waitlist').insert({ email: waitlistEmail })
    setWaitlistLoading(false)
    if (error) {
      setWaitlistError('This email is already on the waitlist.')
    } else {
      setWaitlistDone(true)
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1'
            entry.target.style.transform = 'translateY(0)'
          }
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('.fade-up').forEach((el) => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(24px)'
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
      observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ fontFamily: "'Geist', sans-serif", background: '#111110', color: '#F5F4F0', minHeight: '100vh' }}>

      <style>{MOBILE_CSS}</style>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;900&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 2.5rem', borderBottom: '1px solid #1E1E1C',
        position: 'sticky', top: 0, background: 'rgba(17,17,16,0.85)',
        backdropFilter: 'blur(12px)', zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, background: '#1A1A18',
            border: '1px solid #333330', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#3B82F6'
          }}>V</div>
          Vaultix AI
        </div>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <a href="/" style={{ color: '#888884', fontSize: 14, textDecoration: 'none', transition: 'color 150ms' }}
            onMouseEnter={e => e.target.style.color = '#F5F4F0'}
            onMouseLeave={e => e.target.style.color = '#888884'}>Home</a>
          <a href="#process" style={{ color: '#888884', fontSize: 14, textDecoration: 'none', transition: 'color 150ms' }}
            onMouseEnter={e => e.target.style.color = '#F5F4F0'}
            onMouseLeave={e => e.target.style.color = '#888884'}>How it works</a>
          <a href="#pricing" style={{ color: '#888884', fontSize: 14, textDecoration: 'none', transition: 'color 150ms' }}
            onMouseEnter={e => e.target.style.color = '#F5F4F0'}
            onMouseLeave={e => e.target.style.color = '#888884'}>Pricing</a>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/login" style={{
            color: '#F5F4F0', padding: '8px 16px',
            borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.15)', transition: 'border-color 150ms',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}>
            Log In
          </Link>
          <Link to="/signup" style={{
            background: '#3B82F6', color: '#fff', padding: '8px 16px',
            borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none',
            transition: 'background 150ms',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#2563EB'}
            onMouseLeave={e => e.currentTarget.style.background = '#3B82F6'}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section" style={{
        position: 'relative', minHeight: '92vh', display: 'flex',
        alignItems: 'center', padding: '8rem 2.5rem 5rem', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1600&q=80)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.2) saturate(0.5)'
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(17,17,16,0.2) 0%, rgba(17,17,16,0.6) 60%, #111110 100%)'
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, width: '100%' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.75rem' }}>
            AWS Cost Intelligence
          </p>
          <h1 className="hero-h1" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: '1.75rem', color: '#F5F4F0' }}>
            AWS is charging you for things<br />
            you <span style={{ color: '#3B82F6' }}>forgot exist.</span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(245,244,240,0.5)', lineHeight: 1.75, maxWidth: 460, marginBottom: '2.25rem' }}>
            Connect your AWS account in 5 minutes. We find the waste. You only pay when you save.
          </p>
          <div className="hero-buttons" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <Link to="/signup" className="hero-btn" style={{
              background: '#F5F4F0', color: '#111110', padding: '11px 24px',
              borderRadius: 7, fontSize: 14, fontWeight: 600, textDecoration: 'none',
              transition: 'all 150ms', display: 'inline-block'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E5E4E0'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F5F4F0'; e.currentTarget.style.transform = 'translateY(0)' }}>
              Get Started
            </Link>
            <a href="#process" className="hero-btn" style={{
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
              padding: '11px 24px', borderRadius: 7, fontSize: 14,
              border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none', transition: 'all 150ms'
            }}
              onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff' }}
              onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.color = 'rgba(255,255,255,0.7)' }}>
              See how it works
            </a>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
            No upfront cost · Read-only AWS access · You only pay when we save you money
          </p>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="section-pad" style={{ background: '#0E0E0C', borderTop: '1px solid #1E1E1C', borderBottom: '1px solid #1E1E1C', padding: '5rem 2.5rem' }}>
        <div className="fade-up">
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555552', marginBottom: '1rem' }}>The process</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '3rem', color: '#F5F4F0' }}>
            Three steps to finding your waste
          </h2>
        </div>
        <div className="process-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
          {[
            { num: '01 — Connect', title: 'Read-only access in 5 minutes', desc: 'Create a read-only role in your AWS account in under 5 minutes. We never write to your infrastructure.' },
            { num: '02 — Analyze', title: 'We scan every resource', desc: 'We check every resource against 50+ proven cost patterns. No agents, no scripts, nothing to install.' },
            { num: '03 — Fix', title: 'Prioritized report, delivered', desc: 'You get a clear report with exactly what to fix and how much you\'ll save. Quick wins first.' },
          ].map((step, i) => (
            <div key={i} className={`fade-up process-step-${i}`} style={{
              padding: '2rem',
              borderRight: i < 2 ? '1px solid #1E1E1C' : 'none',
              transition: 'background 200ms'
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#141412'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#555552', letterSpacing: '0.08em', marginBottom: '1.5rem' }}>{step.num}</p>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: '0.625rem', color: '#F5F4F0' }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: '#666662', lineHeight: 1.65 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STAT DIVIDER */}
      <div style={{ position: 'relative', height: 280, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.15) saturate(0.4)'
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #0E0E0C 0%, transparent 25%, transparent 75%, #111110 100%)' }} />
        <div className="fade-up" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', textAlign: 'center', padding: '0 1.5rem' }}>
          <p style={{ fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', fontWeight: 700, color: '#F5F4F0', letterSpacing: '-0.03em', lineHeight: 1 }}>20–40%</p>
          <p style={{ fontSize: 13, color: 'rgba(245,244,240,0.35)', letterSpacing: '0.04em' }}>of the average AWS bill is waste that goes undetected</p>
        </div>
      </div>

      {/* FINDINGS */}
      <section className="section-pad" style={{ padding: '5rem 2.5rem', background: '#111110' }}>
        <div className="fade-up">
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555552', marginBottom: '1rem' }}>What we find</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1rem', color: '#F5F4F0' }}>
            The waste AWS doesn't surface
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#888884', lineHeight: 1.75, maxWidth: 500, marginBottom: '3rem' }}>
            These are the three most common sources of overspend we find in AWS accounts. Most teams don't know they exist until we show them.
          </p>
        </div>
        <div className="findings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#1E1E1C', border: '1px solid #1E1E1C', borderRadius: 10, overflow: 'hidden' }}>
          {[
            { sev: 'Critical', sevColor: '#F87171', title: 'Oversized EC2 instances', desc: 'Instances running at under 10% CPU average. The most common source of AWS waste — and the easiest to fix once you know where to look.', range: '$400–800/mo' },
            { sev: 'High', sevColor: '#FBBF24', title: 'Forgotten idle resources', desc: 'Unattached EBS volumes, unassociated Elastic IPs, idle load balancers. All billing you. All fixable today with zero risk.', range: '$200–500/mo' },
            { sev: 'High', sevColor: '#60A5FA', title: 'Missing Savings Plans', desc: 'Always-on workloads paying On-Demand rates. Savings Plans reduce this by 30–40% immediately with zero architecture changes.', range: '$300–600/mo' },
          ].map((card, i) => (
            <div key={i} className="fade-up" style={{ background: '#111110', padding: '2rem', transition: 'background 200ms' }}
              onMouseEnter={e => e.currentTarget.style.background = '#161614'}
              onMouseLeave={e => e.currentTarget.style.background = '#111110'}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: card.sevColor, marginBottom: '1.25rem' }}>{card.sev}</p>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: '0.625rem', color: '#F5F4F0' }}>{card.title}</h3>
              <p style={{ fontSize: 13, color: '#666662', lineHeight: 1.65, marginBottom: '1.25rem' }}>{card.desc}</p>
              <p style={{ fontSize: 13, color: '#888884' }}>Typical savings: <strong style={{ color: '#F5F4F0', fontWeight: 500 }}>{card.range}</strong></p>
            </div>
          ))}
        </div>
      </section>

      {/* QUOTE DIVIDER */}
      <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=1600&q=80)',
          backgroundSize: 'cover', backgroundPosition: 'center top',
          filter: 'brightness(0.15) saturate(0.4)'
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #111110 0%, transparent 25%, transparent 75%, #0E0E0C 100%)' }} />
        <div className="fade-up" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.75rem', textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)', fontWeight: 500, color: 'rgba(245,244,240,0.65)', maxWidth: 560, lineHeight: 1.55, letterSpacing: '-0.01em' }}>
            "The report found $1,200/month in waste we had no idea existed. Paid for itself in the first week."
          </p>
          <p style={{ fontSize: 12, color: 'rgba(245,244,240,0.2)' }}>— Early access customer, SaaS startup on AWS</p>
        </div>
      </div>

      {/* PRICING */}
      <section id="pricing" className="section-pad" style={{ background: '#0E0E0C', borderTop: '1px solid #1E1E1C', padding: '5rem 2.5rem' }}>
        <div className="fade-up">
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555552', marginBottom: '1rem' }}>Pricing</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1rem', color: '#F5F4F0' }}>
            You pay nothing<br />until we save you money.
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#888884', lineHeight: 1.75, maxWidth: 500, marginBottom: '3rem' }}>
            Our fee is a percentage of verified savings — if we don't find savings, you don't pay.
          </p>
        </div>
        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>

          {/* STANDARD */}
          <div className="fade-up" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222220', borderRadius: 12, padding: '32px', display: 'flex', flexDirection: 'column', transition: 'border-color 200ms' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#333330'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#222220'}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#555552', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Standard</p>
            <p style={{ fontSize: 13, color: '#666662', marginBottom: '1.5rem' }}>For startups and small teams</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#F5F4F0', marginBottom: 4, lineHeight: 1 }}>20%</p>
            <p style={{ fontSize: 12, color: '#888884', marginBottom: '0.5rem' }}>of verified savings</p>
            <p style={{ fontSize: 12, color: '#555552', marginBottom: '1.75rem' }}>You pay nothing until we save you money</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', borderTop: '1px solid #1E1E1C', paddingTop: '1.25rem', flex: 1 }}>
              {['Up to 3 AWS accounts', 'Full AI cost audit', 'Monthly re-scans', 'Email findings report', 'Autopilot included ⚡'].map((f, i) => (
                <li key={i} style={{ fontSize: 13, color: '#888884', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#3B82F6', fontSize: 14, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <Link to="/signup" style={{ display: 'block', boxSizing: 'border-box', padding: '11px 0', borderRadius: 7, fontSize: 14, fontWeight: 500, textAlign: 'center', background: 'transparent', color: '#F5F4F0', border: '1px solid #2A2A28', textDecoration: 'none', transition: 'all 150ms' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3A3A38'; e.currentTarget.style.background = '#161614' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A28'; e.currentTarget.style.background = 'transparent' }}>
              Get Started
            </Link>
          </div>

          {/* TEAM */}
          <div className="fade-up" style={{ background: 'rgba(255,255,255,0.03)', border: '2px solid #3B82F6', borderRadius: 12, padding: '32px', position: 'relative', display: 'flex', flexDirection: 'column', transition: 'border-color 200ms' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#60A5FA'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#3B82F6'}>
            <div style={{ position: 'absolute', top: -1, right: '1.5rem', background: '#3B82F6', color: '#fff', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '4px 12px', borderRadius: '0 0 6px 6px', textTransform: 'uppercase' }}>
              Most Popular
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#555552', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Team</p>
            <p style={{ fontSize: 13, color: '#666662', marginBottom: '1.5rem' }}>For growing engineering teams</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#F5F4F0', marginBottom: 4, lineHeight: 1 }}>15%</p>
            <p style={{ fontSize: 12, color: '#888884', marginBottom: '0.5rem' }}>of verified savings</p>
            <p style={{ fontSize: 12, color: '#555552', marginBottom: '1.75rem' }}>Volume discount for larger savings</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', borderTop: '1px solid #1E1E1C', paddingTop: '1.25rem', flex: 1 }}>
              {['Unlimited AWS accounts', 'Everything in Standard', 'Autopilot included ⚡', 'Slack alerts', 'Priority support', 'Quarterly business review'].map((f, i) => (
                <li key={i} style={{ fontSize: 13, color: '#888884', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#3B82F6', fontSize: 14, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <Link to="/signup" style={{ display: 'block', boxSizing: 'border-box', padding: '11px 0', borderRadius: 7, fontSize: 14, fontWeight: 500, textAlign: 'center', background: '#3B82F6', color: '#fff', border: 'none', textDecoration: 'none', transition: 'background 150ms' }}
              onMouseEnter={e => e.currentTarget.style.background = '#2563EB'}
              onMouseLeave={e => e.currentTarget.style.background = '#3B82F6'}>
              Get Started
            </Link>
          </div>

          {/* ENTERPRISE */}
          <div className="fade-up" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222220', borderRadius: 12, padding: '32px', display: 'flex', flexDirection: 'column', transition: 'border-color 200ms' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#333330'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#222220'}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#555552', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Enterprise</p>
            <p style={{ fontSize: 13, color: '#666662', marginBottom: '1.5rem' }}>For large orgs and agencies</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#F5F4F0', marginBottom: 4, lineHeight: 1 }}>Custom</p>
            <p style={{ fontSize: 12, color: '#888884', marginBottom: '0.5rem' }}>&nbsp;</p>
            <p style={{ fontSize: 12, color: '#555552', marginBottom: '1.75rem' }}>Negotiated rate based on portfolio size</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', borderTop: '1px solid #1E1E1C', paddingTop: '1.25rem', flex: 1 }}>
              {['Unlimited accounts', 'White-glove onboarding', 'Dedicated account manager', 'Custom reporting', 'SLA guarantee', 'SSO + audit logs'].map((f, i) => (
                <li key={i} style={{ fontSize: 13, color: '#888884', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#3B82F6', fontSize: 14, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <button onClick={() => { setShowContact(true); setContactSent(false); setContactForm({ name: '', email: '', message: '' }) }}
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '11px 0', borderRadius: 7, fontSize: 14, fontWeight: 500, textAlign: 'center', background: 'transparent', color: '#F5F4F0', border: '1px solid #2A2A28', cursor: 'pointer', transition: 'all 150ms' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3A3A38'; e.currentTarget.style.background = '#161614' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A28'; e.currentTarget.style.background = 'transparent' }}>
              Contact Us
            </button>
          </div>

        </div>
      </section>

      {/* WAITLIST */}
      <section id="waitlist" className="section-pad" style={{ background: '#0E0E0C', borderTop: '1px solid #1E1E1C', padding: '5rem 2.5rem' }}>
        <div className="fade-up" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B82F6', marginBottom: '1rem' }}>
            EARLY ACCESS
          </p>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1rem', color: '#F5F4F0' }}>
            Ready to find your AWS waste?
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#888884', lineHeight: 1.75, marginBottom: '2rem' }}>
            Connect your AWS account in 5 minutes. You only pay when we save you money.
          </p>
          <Link to="/signup" style={{
            display: 'inline-block', background: '#3B82F6', color: '#fff',
            border: 'none', borderRadius: 8, padding: '12px 28px',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
            transition: 'background 150ms, transform 150ms',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#3B82F6'; e.currentTarget.style.transform = 'translateY(0)' }}>
            Start Finding Savings →
          </Link>
          <p style={{ fontSize: 13, color: '#555552', marginTop: '1.25rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#3B82F6', textDecoration: 'none' }}>Log in</Link>
          </p>
        </div>
      </section>

      {/* CONTACT MODAL */}
      {showContact && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowContact(false) }}>
          <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 12, padding: 32, width: '100%', maxWidth: 480, position: 'relative' }}>
            <button onClick={() => setShowContact(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' }}>×</button>
            {contactSent ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <span style={{ fontSize: 32, color: '#22c55e', marginBottom: 12, display: 'block' }}>✓</span>
                <p style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginBottom: 8 }}>Message sent!</p>
                <p style={{ fontSize: 14, color: '#6b7280' }}>We'll be in touch within 24 hours.</p>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F4F0', marginBottom: 8 }}>Get in touch</h2>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Tell us about your AWS environment and we'll get back to you within 24 hours.</p>
                <input type="text" placeholder="Your name" value={contactForm.name}
                  onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', background: '#111110', border: '1px solid #2a2a28', borderRadius: 6, padding: '10px 14px', color: '#F5F4F0', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} />
                <input type="email" placeholder="Work email" value={contactForm.email}
                  onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                  style={{ width: '100%', background: '#111110', border: '1px solid #2a2a28', borderRadius: 6, padding: '10px 14px', color: '#F5F4F0', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} />
                <textarea placeholder="Tell us about your AWS setup — number of accounts, rough monthly spend, main services used." rows={4}
                  value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                  style={{ width: '100%', background: '#111110', border: '1px solid #2a2a28', borderRadius: 6, padding: '10px 14px', color: '#F5F4F0', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />
                <button onClick={handleContactSubmit}
                  style={{ width: '100%', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
                  Send Message →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="footer" style={{ padding: '2rem 2.5rem', borderTop: '1px solid #1E1E1C', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: '#1A1A18', border: '1px solid #333330', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>V</div>
          Vaultix AI
        </div>
        <div className="footer-links" style={{ display: 'flex', gap: '1.5rem' }}>
          {['Privacy', 'Terms'].map(l => (
            <a key={l} href="#" style={{ fontSize: 13, color: '#555552', textDecoration: 'none', transition: 'color 150ms' }}
              onMouseEnter={e => e.target.style.color = '#888884'}
              onMouseLeave={e => e.target.style.color = '#555552'}>{l}</a>
          ))}
          <a href="mailto:hello@vaultixai.app" style={{ fontSize: 13, color: '#555552', textDecoration: 'none', transition: 'color 150ms' }}
            onMouseEnter={e => e.target.style.color = '#888884'}
            onMouseLeave={e => e.target.style.color = '#555552'}>Contact</a>
        </div>
        <p style={{ fontSize: 12, color: '#333330' }}>© 2026 Vaultix AI · Built for engineers, by engineers.</p>
      </footer>
    </div>
  )
}
