import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  Maximize2,
  Minimize2,
  Bell
} from 'lucide-react';

export default function DisplayPage() {
  const { socket } = useSocket();
  const [counters, setCounters] = useState([]);
  const [services, setServices] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentlyCalledToken, setRecentlyCalledToken] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDisplayData = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        api.getCounters(),
        api.getServices()
      ]);

      if (cRes.success) setCounters(cRes.counters);
      if (sRes.success) setServices(sRes.services);
    } catch (err) {
      console.error('Failed to load display board data:', err);
    }
  };

  useEffect(() => {
    loadDisplayData();
    const interval = setInterval(loadDisplayData, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleTokenCalled = (data) => {
      setRecentlyCalledToken(data);
      loadDisplayData();
      setTimeout(() => {
        setRecentlyCalledToken(null);
      }, 10000);
    };

    const handleUpdate = () => loadDisplayData();

    socket.on('queue:token_called', handleTokenCalled);
    socket.on('queue:updated', handleUpdate);
    socket.on('queue:joined', handleUpdate);

    return () => {
      socket.off('queue:token_called', handleTokenCalled);
      socket.off('queue:updated', handleUpdate);
      socket.off('queue:joined', handleUpdate);
    };
  }, [socket]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#06080d',
      color: '#ffffff',
      padding: '30px 40px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Top Header */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '20px',
          marginBottom: '28px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#ffffff',
              color: '#06080d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem'
            }}>
              GQ
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Lobby Waiting Display
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Real-Time Desk Announcements
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '1.8rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: '#ffffff',
                letterSpacing: '0.02em'
              }}>
                {currentTime.toLocaleTimeString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>

            <button
              onClick={toggleFullscreen}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Recently Called Banner */}
        {recentlyCalledToken && (
          <div style={{
            background: 'var(--status-success-bg)',
            border: '1px solid var(--status-success)',
            borderRadius: '10px',
            padding: '16px 24px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Bell size={24} color="var(--status-success)" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--status-success)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Now Calling
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                  {recentlyCalledToken.tokenNumber}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Proceed to window</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
                {recentlyCalledToken.counterName}
              </div>
            </div>
          </div>
        )}

        {/* Now Serving Desks Grid */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-tertiary)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '16px'
          }}>
            Serving at Windows
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px'
          }}>
            {counters.map((c) => {
              const isOpen = c.status === 'active';
              return (
                <div
                  key={c.counter_id}
                  style={{
                    background: '#0e121b',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '22px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                      {c.counter_name}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      background: isOpen ? 'var(--status-success-bg)' : 'rgba(255, 255, 255, 0.05)',
                      color: isOpen ? 'var(--status-success)' : 'var(--text-tertiary)'
                    }}>
                      {c.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    Current Token
                  </div>

                  <div style={{
                    fontSize: '2.4rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: isOpen ? '#ffffff' : 'var(--text-tertiary)',
                    marginTop: '2px'
                  }}>
                    {c.current_token_number || (isOpen ? 'Ready' : 'Closed')}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    {c.service_name || 'General'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Up Next Strip */}
        <div>
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-tertiary)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '14px'
          }}>
            Next in line by department
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px'
          }}>
            {services.map((svc) => (
              <div
                key={svc.service_id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#ffffff' }}>
                    {svc.service_name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {svc.service_code}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                    {svc.current_queue_length}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    waiting
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '36px',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.78rem',
        color: 'var(--text-tertiary)'
      }}>
        <span>Please have your documents ready when your token is called.</span>
        <span>GhostQueue Live</span>
      </div>
    </div>
  );
}
