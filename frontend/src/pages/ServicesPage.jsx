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
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Service Desks
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Choose a department desk to enter the queue and generate a digital pass.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
          <Search size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          Loading services...
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={32} color="var(--text-tertiary)" style={{ margin: '0 auto 10px auto' }} />
          <h3 style={{ fontSize: '1rem', color: '#ffffff', marginBottom: '4px' }}>No departments found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No service desks match your query.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {filteredServices.map((svc) => {
            const IconComponent = iconMap[svc.icon] || Layers;

            return (
              <div
                key={svc.service_id}
                className="glass-panel"
                style={{
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <IconComponent size={16} color="#94a3b8" />
                      </div>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: '#93c5fd',
                        background: 'var(--accent-light)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {svc.service_code}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.74rem',
                      fontWeight: 500,
                      color: svc.is_active ? 'var(--status-success)' : 'var(--text-tertiary)'
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: svc.is_active ? 'var(--status-success)' : 'var(--border-medium)'
                      }} />
                      {svc.is_active ? 'Open' : 'Unavailable'}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                    {svc.service_name}
                  </h3>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px', minHeight: '40px' }}>
                    {svc.description}
                  </p>
                </div>

                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Waiting</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        {svc.current_queue_length}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Windows</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        {svc.active_counters_count}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>/{svc.total_counters_count}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Est. Wait</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        ~{svc.estimated_wait_time}m
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openJoinModal(svc)}
                    disabled={!svc.is_active}
                    className="btn-primary"
                    style={{ width: '100%', padding: '9px', fontSize: '0.86rem' }}
                  >
                    <span>Join Queue</span>
                    <ArrowRight size={14} />
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
