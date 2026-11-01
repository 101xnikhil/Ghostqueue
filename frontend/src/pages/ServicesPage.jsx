import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  Layers,
  Search,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  DollarSign,
  FileText,
  Monitor,
  LifeBuoy
} from 'lucide-react';

const iconMap = {
  GraduationCap,
  DollarSign,
  FileText,
  Monitor,
  LifeBuoy
};

export default function ServicesPage({ openJoinModal }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { socket } = useSocket();

  const loadServices = async () => {
    try {
      const res = await api.getServices();
      if (res.success) {
        setServices(res.services);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();

    if (socket) {
      socket.on('queue:updated', () => loadServices());
      socket.on('queue:joined', () => loadServices());
    }

    return () => {
      if (socket) {
        socket.off('queue:updated');
        socket.off('queue:joined');
      }
    };
  }, [socket]);

  const filteredServices = services.filter((s) =>
    s.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.service_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container" style={{ padding: '40px 24px 80px 24px' }}>
      {/* Header & Search */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '36px'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Campus Service Catalog
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', marginTop: '4px' }}>
            Available Queue Services
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
            Select a service desk below to join the digital queue and receive your personalized telemetry token.
          </p>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            placeholder="Search departments or codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '40px', background: 'rgba(15, 23, 42, 0.85)' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading live service status...
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <AlertCircle size={40} color="var(--text-dim)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '6px' }}>No services found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No departments match your search term.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px'
        }}>
          {filteredServices.map((svc) => {
            const IconComponent = iconMap[svc.icon] || Layers;

            return (
              <div
                key={svc.service_id}
                className="glass-panel"
                style={{
                  padding: '26px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Status indicator line */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: svc.is_active ? 'var(--grad-primary)' : 'rgba(255,255,255,0.1)'
                }} />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <IconComponent size={20} color="#60a5fa" />
                      </div>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: '#93c5fd',
                        background: 'rgba(59, 130, 246, 0.12)',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        {svc.service_code}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: svc.is_active ? '#34d399' : '#f87171'
                    }}>
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: svc.is_active ? '#10b981' : '#ef4444'
                      }} />
                      {svc.is_active ? 'Open' : 'Unavailable'}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                    {svc.service_name}
                  </h3>

                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '22px', minHeight: '44px' }}>
                    {svc.description}
                  </p>
                </div>

                <div>
                  {/* Dynamic Telemetry Metrics */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '12px',
                    borderRadius: '10px',
                    marginBottom: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.04)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Waiting</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
                        {svc.current_queue_length}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Counters</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                        {svc.active_counters_count}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>/{svc.total_counters_count}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Est. Wait</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#60a5fa', marginTop: '2px' }}>
                        ~{svc.estimated_wait_time}m
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openJoinModal(svc)}
                    disabled={!svc.is_active}
                    className="btn-primary"
                    style={{ width: '100%', height: '42px', fontSize: '0.92rem' }}
                  >
                    <span>Join Queue</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
