import { Link } from 'react-router-dom'
import { useEffect } from 'react'

export default function Landing() {
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

      {/* Geist font */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <a href="#process" style={{ color: '#888884', fontSize: 14, textDecoration: 'none', transition: 'color 150ms' }}
            onMouseEnter={e => e.target.style.color = '#F5F4F0'}
            onMouseLeave={e => e.target.style.color = '#888884'}>How it works</a>
          <a href="#pricing" style={{ color: '#888884', fontSize: 14, textDecoration: 'none', transition: 'color 150ms' }}
            onMouseEnter={e => e.target.style.color = '#F5F4F0'}
            onMouseLeave={e => e.target.style.color = '#888884'}>Pricing</a>
        </div>
        <Link to="/signup" style={{
          background: '#3B82F6', color: '#fff', padding: '8px 18px',
          borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: 'none',
          transition: 'background 150ms'
        }}
          onMouseEnter={e => e.target.style.background = '#2563EB'}
          onMouseLeave={e => e.target.style.background = '#3B82F6'}>
          Start Free Trial
        </Link>
      </nav>

      {/* HERO */}
      <section style={{
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
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.75rem' }}>
            AWS Cost Intelligence
          </p>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: '1.75rem', color: '#F5F4F0' }}>
            AWS is charging you for things<br />
            you <span style={{ color: '#3B82F6' }}>forgot exist.</span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(245,244,240,0.5)', lineHeight: 1.75, maxWidth: 460, marginBottom: '2.25rem' }}>
            Vaultix AI connects to your AWS account, scans every resource for waste, and delivers a prioritized fix list with specific resource IDs and exact dollar amounts.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <Link to="/signup" style={{
              background: '#F5F4F0', color: '#111110', padding: '11px 24px',
              borderRadius: 7, fontSize: 14, fontWeight: 600, textDecoration: 'none',
              transition: 'all 150ms', display: 'inline-block'
            }}
              onMouseEnter={e => { e.target.style.background = '#E5E4E0'; e.target.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.target.style.background = '#F5F4F0'; e.target.style.transform = 'translateY(0)' }}>
              Start Free Trial
            </Link>
            <a href="#process" style={{
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
            14-day trial · Credit card required · Cancel anytime · Read-only AWS access
          </p>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" style={{ background: '#0E0E0C', borderTop: '1px solid #1E1E1C', borderBottom: '1px solid #1E1E1C', padding: '5rem 2.5rem' }}>
        <div className="fade-up">
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555552', marginBottom: '1rem' }}>The process</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '3rem', color: '#F5F4F0' }}>
            Three steps to finding your waste
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
          {[
            { num: '01 — Connect', title: 'Read-only access in 5 minutes', desc: 'Create a read-only IAM role in your AWS account. We never write to your infrastructure. No agents, no scripts.' },
            { num: '02 — Analyze', title: 'AI scans every resource', desc: 'Our AI checks EC2, RDS, S3, networking, and more against 50+ proven cost patterns across every region.' },
            { num: '03 — Fix', title: 'Prioritized report, delivered', desc: 'Specific resource IDs, exact savings amounts, effort levels, and a 90-day action plan. Quick wins first.' },
          ].map((step, i) => (
            <div key={i} className="fade-up" style={{
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
        <div className="fade-up" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '3.5rem', fontWeight: 700, color: '#F5F4F0', letterSpacing: '-0.03em', lineHeight: 1 }}>20–40%</p>
          <p style={{ fontSize: 13, color: 'rgba(245,244,240,0.35)', letterSpacing: '0.04em' }}>of the average AWS bill is waste that goes undetected</p>
        </div>
      </div>

      {/* FINDINGS */}
      <section style={{ padding: '5rem 2.5rem', background: '#111110' }}>
        <div className="fade-up">
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555552', marginBottom: '1rem' }}>What we find</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1rem', color: '#F5F4F0' }}>
            The waste AWS doesn't surface
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#888884', lineHeight: 1.75, maxWidth: 500, marginBottom: '3rem' }}>
            These are the three most common sources of overspend we find in AWS accounts. Most teams don't know they exist until we show them.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#1E1E1C', border: '1px solid #1E1E1C', borderRadius: 10, overflow: 'hidden' }}>
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
          <p style={{ fontSize: '1.2rem', fontWeight: 500, color: 'rgba(245,244,240,0.65)', maxWidth: 560, lineHeight: 1.55, letterSpacing: '-0.01em' }}>
            "The report found $1,200/month in waste we had no idea existed. Paid for itself in the first week."
          </p>
          <p style={{ fontSize: 12, color: 'rgba(245,244,240,0.2)' }}>— Early access customer, SaaS startup on AWS</p>
        </div>
      </div>

      {/* PRICING */}
      <section id="pricing" style={{ background: '#0E0E0C', borderTop: '1px solid #1E1E1C', padding: '5rem 2.5rem' }}>
        <div className="fade-up">
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555552', marginBottom: '1rem' }}>Pricing</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1rem', color: '#F5F4F0' }}>
            Simple pricing.<br />Real savings.
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#888884', lineHeight: 1.75, maxWidth: 500, marginBottom: '3rem' }}>
            Start your 14-day trial today. Credit card required — cancel before day 14 and pay nothing.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* PRO */}
          <div className="fade-up" style={{ background: '#111110', border: '1px solid #222220', borderRadius: 10, padding: '2rem', transition: 'border-color 200ms' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#333330'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#222220'}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#555552', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Pro</p>
            <p style={{ fontSize: '2.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#F5F4F0', marginBottom: 2 }}>$49<span style={{ fontSize: '1rem', fontWeight: 400, color: '#555552' }}>/mo</span></p>
            <p style={{ fontSize: 12, color: '#555552', marginBottom: '1.5rem' }}>Up to 3 AWS accounts</p>
            <ul style={{ listStyle: 'none', marginBottom: '2rem', borderTop: '1px solid #1E1E1C', paddingTop: '1.25rem' }}>
              {['Full audit report with all findings', 'Specific resource IDs and savings', '90-day prioritized action plan', 'Email alerts for new waste', 'Terraform modules included'].map((f, i) => (
                <li key={i} style={{ fontSize: 13, color: '#888884', padding: '7px 0', borderBottom: '1px solid #1A1A18', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#3B82F6', fontSize: 14 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <Link to="/signup" style={{ display: 'block', width: '100%', padding: 11, borderRadius: 7, fontSize: 14, fontWeight: 500, textAlign: 'center', background: 'transparent', color: '#F5F4F0', border: '1px solid #2A2A28', textDecoration: 'none', transition: 'all 150ms' }}
              onMouseEnter={e => { e.target.style.borderColor = '#3A3A38'; e.target.style.background = '#161614' }}
              onMouseLeave={e => { e.target.style.borderColor = '#2A2A28'; e.target.style.background = 'transparent' }}>
              Start Free Trial
            </Link>
          </div>
          {/* TEAM */}
          <div className="fade-up" style={{ background: '#050E1A', border: '2px solid #3B82F6', borderRadius: 10, padding: '2rem', position: 'relative', transition: 'border-color 200ms' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#60A5FA'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#3B82F6'}>
            <div style={{ position: 'absolute', top: -1, right: '1.5rem', background: '#3B82F6', color: '#fff', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '4px 12px', borderRadius: '0 0 6px 6px', textTransform: 'uppercase' }}>
              Most Popular
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#555552', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Team</p>
            <p style={{ fontSize: '2.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#F5F4F0', marginBottom: 2 }}>$99<span style={{ fontSize: '1rem', fontWeight: 400, color: '#555552' }}>/mo</span></p>
            <p style={{ fontSize: 12, color: '#555552', marginBottom: '1.5rem' }}>Unlimited AWS accounts</p>
            <ul style={{ listStyle: 'none', marginBottom: '2rem', borderTop: '1px solid #1E1E1C', paddingTop: '1.25rem' }}>
              {['Everything in Pro', 'Unlimited AWS accounts', 'Slack integration for alerts', 'Multi-user team access', 'Priority support', 'Quarterly business review'].map((f, i) => (
                <li key={i} style={{ fontSize: 13, color: '#888884', padding: '7px 0', borderBottom: '1px solid #1A1A18', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#3B82F6', fontSize: 14 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <Link to="/signup" style={{ display: 'block', width: '100%', padding: 11, borderRadius: 7, fontSize: 14, fontWeight: 500, textAlign: 'center', background: '#3B82F6', color: '#fff', border: 'none', textDecoration: 'none', transition: 'background 150ms' }}
              onMouseEnter={e => e.target.style.background = '#2563EB'}
              onMouseLeave={e => e.target.style.background = '#3B82F6'}>
              Start Free Trial
            </Link>
          </div>
        </div>

        {/* MANUAL AUDIT */}
        <div className="fade-up" style={{ background: '#111110', border: '1px solid #1E1E1C', borderRadius: 10, padding: '2rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#F5F4F0', marginBottom: 6 }}>
              Prefer it done for you? <span style={{ color: '#F5F4F0', fontWeight: 600 }}>Manual Audit — $300 flat.</span>
            </h3>
            <p style={{ fontSize: 13, color: '#666662', lineHeight: 1.65, maxWidth: 480 }}>
              A real AWS infrastructure engineer runs your audit and delivers a full findings report in 48 hours.
            </p>
          </div>
          <a href="https://calendly.com/issacguerrero67/aws-audit-call" target="_blank" rel="noreferrer" style={{ background: 'transparent', color: '#F5F4F0', border: '1px solid #2A2A28', padding: '10px 20px', borderRadius: 7, fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 150ms' }}
            onMouseEnter={e => { e.target.style.borderColor = '#3A3A38'; e.target.style.background = '#161614' }}
            onMouseLeave={e => { e.target.style.borderColor = '#2A2A28'; e.target.style.background = 'transparent' }}>
            Book Your Audit →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '2rem 2.5rem', borderTop: '1px solid #1E1E1C', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: '#1A1A18', border: '1px solid #333330', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>V</div>
          Vaultix AI
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {['Privacy', 'Terms'].map(l => (
            <a key={l} href="#" style={{ fontSize: 13, color: '#555552', textDecoration: 'none', transition: 'color 150ms' }}
              onMouseEnter={e => e.target.style.color = '#888884'}
              onMouseLeave={e => e.target.style.color = '#555552'}>{l}</a>
          ))}
          <a href="mailto:issacguerrero67@gmail.com" style={{ fontSize: 13, color: '#555552', textDecoration: 'none', transition: 'color 150ms' }}
            onMouseEnter={e => e.target.style.color = '#888884'}
            onMouseLeave={e => e.target.style.color = '#555552'}>Contact</a>
        </div>
        <p style={{ fontSize: 12, color: '#333330' }}>© 2026 Vaultix AI · Built for engineers, by engineers.</p>
      </footer>
    </div>
  )
}
