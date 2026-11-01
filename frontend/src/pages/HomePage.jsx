import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Clock, 
  ArrowRight, 
  Check
} from 'lucide-react';

export default function HomePage({ setActivePage, openJoinModal }) {
  const [services, setServices] = useState([]);

  useEffect(() => {
    async function loadPreview() {
      try {
        const res = await api.getServices();
        if (res.success) {
          setServices(res.services);
        }
      } catch (err) {
        console.error('Failed to load services preview:', err);
      }
    }
    loadPreview();
  }, []);

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Hero Section */}
      <section style={{
        padding: '70px 0 50px 0',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div className="container" style={{ maxWidth: '820px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '999px',
            padding: '4px 12px',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            marginBottom: '20px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-success)' }} />
            <span>Digital queue telemetry & estimated wait times</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '16px',
            color: '#ffffff'
          }}>
            Smart queue management for busy campuses and desks.
          </h1>

          <p style={{
            fontSize: '1.05rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '620px',
            margin: '0 auto 30px auto'
          }}>
            Join queues digitally, monitor your position live from your phone, and receive an instant alert when it’s your turn at the window.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActivePage('services')}
              className="btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.92rem' }}
            >
              <span>Join a Queue</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => setActivePage('tracking')}
              className="btn-secondary"
              style={{ padding: '10px 20px', fontSize: '0.92rem' }}
            >
              <Clock size={16} />
              <span>Track Token</span>
            </button>
          </div>

          {/* Simple bullet points */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            marginTop: '36px',
            fontSize: '0.8rem',
            color: 'var(--text-tertiary)',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} color="var(--status-success)" />
              <span>Zero physical standing</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} color="var(--status-success)" />
              <span>Accurate wait predictions</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} color="var(--status-success)" />
              <span>Live desk audio chime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Service Desks Section */}
      <section className="container" style={{ marginTop: '50px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Active Service Windows
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Select a desk below to request a digital token and check wait times.
            </p>
          </div>

          <button
            onClick={() => setActivePage('services')}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <span>View Catalog</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {services.slice(0, 4).map((svc) => (
            <div
              key={svc.service_id}
              className="glass-panel"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--accent-light)',
                    color: '#93c5fd',
                    border: '1px solid var(--accent-border)'
                  }}>
                    {svc.service_code}
                  </span>

                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.75rem',
                    color: svc.is_active ? 'var(--status-success)' : 'var(--text-tertiary)'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: svc.is_active ? 'var(--status-success)' : 'var(--border-medium)'
                    }} />
                    {svc.is_active ? 'Open' : 'Unavailable'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                  {svc.service_name}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '18px', minHeight: '38px', lineHeight: 1.45 }}>
                  {svc.description}
                </p>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '14px',
                  fontSize: '0.82rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', textTransform: 'uppercase' }}>In Queue:</span>
                    <strong style={{ color: '#ffffff', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>{svc.current_queue_length}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Est. Wait:</span>
                    <strong style={{ color: '#ffffff', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>~{svc.estimated_wait_time}m</strong>
                  </div>
                </div>

                <button
                  onClick={() => openJoinModal(svc)}
                  disabled={!svc.is_active}
                  className="btn-primary"
                  style={{ width: '100%', padding: '8px', fontSize: '0.84rem' }}
                >
                  Join Queue
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works - Minimal 4-step Grid */}
      <section className="container" style={{ marginTop: '70px' }}>
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '40px', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            How it works
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Four straightforward steps to streamline lobby waiting.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          {[
            {
              step: '01',
              title: 'Select desk',
              desc: 'Choose your desired service counter on your phone or laptop.'
            },
            {
              step: '02',
              title: 'Receive token',
              desc: 'Get an atomically assigned digital pass with an initial wait estimate.'
            },
            {
              step: '03',
              title: 'Wait freely',
              desc: 'Track your live position and predicted arrival time without staying in line.'
            },
            {
              step: '04',
              title: 'Proceed to window',
              desc: 'Receive a live chime and on-screen call when your window is ready.'
            }
          ].map((item) => (
            <div
              key={item.step}
              className="glass-panel"
              style={{ padding: '20px' }}
            >
              <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                {item.step}
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
