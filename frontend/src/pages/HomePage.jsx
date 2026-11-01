import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Activity, 
  TrendingUp, 
  Zap,
  Building
} from 'lucide-react';

export default function HomePage({ setActivePage, openJoinModal }) {
  const [services, setServices] = useState([]);

  useEffect(() => {
    async function loadPreview() {
      try {
        const res = await api.getServices();
        if (res.success) {
          setServices(res.services.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load services preview:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPreview();
  }, []);

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Hero Section */}
      <section style={{
        position: 'relative',
        padding: '90px 0 70px 0',
        textAlign: 'center',
        background: 'var(--grad-hero)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          {/* Tag Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '999px',
            padding: '6px 16px',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#93c5fd',
            marginBottom: '24px',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
          }}>
            <Sparkles size={14} color="#60a5fa" />
            <span>Smart Queue Management & Waiting-Time Prediction</span>
          </div>

          {/* Main Headings */}
          <h1 style={{
            fontSize: 'clamp(2.4rem, 5vw, 4rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            color: '#ffffff'
          }}>
            Waiting Shouldn't <br />
            <span style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Waste Your Time.
            </span>
          </h1>

          <p style={{
            fontSize: '1.15rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            maxWidth: '680px',
            margin: '0 auto 36px auto'
          }}>
            Join queues digitally, track your position live with millisecond telemetry, and know exactly when it’s your turn. Spend your time doing what matters.
          </p>

          {/* Primary Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActivePage('services')}
              className="btn-primary"
              style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '12px' }}
            >
              <Zap size={18} />
              Join a Queue Now
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => setActivePage('tracking')}
              className="btn-secondary"
              style={{ padding: '14px 26px', fontSize: '1rem', borderRadius: '12px' }}
            >
              <Clock size={18} />
              Track My Active Token
            </button>
          </div>

          {/* Trust Highlights */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '30px',
            marginTop: '48px',
            color: 'var(--text-dim)',
            fontSize: '0.85rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#34d399" />
              <span>Zero Physical Line-Ups</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} color="#60a5fa" />
              <span>Predictive Wait Telemetry</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#a78bfa" />
              <span>PostgreSQL Concurrency-Locked</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Campus Services Spotlight */}
      <section className="container" style={{ marginTop: '70px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live System Status
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginTop: '4px' }}>
              Available Service Counters
            </h2>
          </div>
          <button
            onClick={() => setActivePage('services')}
            className="btn-secondary"
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            View All Services <ArrowRight size={14} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {services.map((svc) => (
            <div
              key={svc.service_id}
              className="glass-panel"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    {svc.service_code}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#34d399' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    Active ({svc.active_counters_count} windows)
                  </div>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                  {svc.service_name}
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5, minHeight: '40px' }}>
                  {svc.description}
                </p>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: '10px',
                  marginBottom: '16px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Waiting</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24' }}>
                      {svc.current_queue_length} people
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Est. Wait</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#60a5fa' }}>
                      ~{svc.estimated_wait_time} mins
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openJoinModal(svc)}
                  className="btn-primary"
                  style={{ width: '100%', fontSize: '0.9rem' }}
                >
                  Join Queue
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container" style={{ marginTop: '90px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-violet)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Frictionless Flow
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginTop: '6px' }}>
            How GhostQueue Works
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '540px', margin: '8px auto 0 auto' }}>
            Eliminate chaotic queues in high-traffic administrative buildings in 4 effortless steps.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px'
        }}>
          {[
            {
              step: '01',
              title: 'Choose Service',
              desc: 'Select the department or office you need assistance from on your phone or workstation.',
              icon: Building,
              color: '#3b82f6'
            },
            {
              step: '02',
              title: 'Instant Digital Token',
              desc: 'Get an atomically sequenced token number guaranteed by PostgreSQL concurrency locks.',
              icon: Zap,
              color: '#8b5cf6'
            },
            {
              step: '03',
              title: 'Live Telemetry',
              desc: 'Relax elsewhere while watching your exact queue position and data-driven wait time prediction update live.',
              icon: Activity,
              color: '#06b6d4'
            },
            {
              step: '04',
              title: 'Walk to Window',
              desc: 'Get a chime notification when only 2 people are ahead, then proceed straight to your assigned counter.',
              icon: CheckCircle2,
              color: '#10b981'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{ padding: '28px', position: 'relative' }}
            >
              <div style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: 'rgba(255, 255, 255, 0.08)',
                position: 'absolute',
                top: '16px',
                right: '20px',
                fontFamily: 'var(--font-mono)'
              }}>
                {item.step}
              </div>

              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: `rgba(${item.color === '#3b82f6' ? '59, 130, 246' : item.color === '#8b5cf6' ? '139, 92, 246' : item.color === '#06b6d4' ? '6, 182, 212' : '16, 185, 129'}, 0.15)`,
                border: `1px solid ${item.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px'
              }}>
                <item.icon size={22} color={item.color} />
              </div>

              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                {item.title}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: '100px',
        borderTop: '1px solid var(--border-subtle)',
        padding: '40px 0',
        textAlign: 'center',
        color: 'var(--text-dim)',
        fontSize: '0.85rem'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="var(--accent-blue)" />
            <span style={{ fontWeight: 700, color: '#ffffff' }}>GhostQueue</span>
            <span>— Smart Queue Management & Waiting-Time Prediction System</span>
          </div>
          <div>
            Apex Engineering Institute • B.Tech CSE Mini-Project
          </div>
        </div>
      </footer>
    </div>
  );
}
