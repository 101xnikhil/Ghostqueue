import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  Tv,
  Maximize2,
  Minimize2,
  Sparkles,
  Layers,
  Bell
} from 'lucide-react';

export default function DisplayPage() {
  const { socket } = useSocket();
  const [counters, setCounters] = useState([]);
  const [services, setServices] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentlyCalledToken, setRecentlyCalledToken] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Clock tick every second
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

      if (cRes.success) {
        setCounters(cRes.counters);
      }
      if (sRes.success) {
        setServices(sRes.services);
      }

      // Also get all called/in_service tokens from admin queues
      const qRes = await api.getAllQueues('status=called').catch(() => ({}));
      if (qRes.success && qRes.tokens) {
        setActiveCalls(qRes.tokens);
      }
    } catch (err) {
      console.error('Failed to load display board data:', err);
    }
  };

  useEffect(() => {
    loadDisplayData();
    const interval = setInterval(loadDisplayData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Listen to real-time socket events for board announcements
  useEffect(() => {
    if (!socket) return;

    const handleTokenCalled = (data) => {
      setRecentlyCalledToken(data);
      loadDisplayData();
      setTimeout(() => {
        setRecentlyCalledToken(null);
      }, 10000);
    };

    const handleUpdate = () => {
      loadDisplayData();
    };

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
      background: '#040711',
      color: '#ffffff',
      padding: '24px 32px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      {/* Top Header Bar */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '20px',
          marginBottom: '28px'
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(59, 130, 246, 0.5)'
            }}>
              <Tv size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                CAMPUS WAITING HALL MONITOR
              </div>
              <div style={{ fontSize: '0.78rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                Live Queue Telemetry • GhostQueue AI Engine
              </div>
            </div>
          </div>

          {/* Time & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Clock */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '1.8rem',
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                color: '#ffffff',
                letterSpacing: '0.05em'
              }}>
                {currentTime.toLocaleTimeString()}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>
        </div>

        {/* Recently Called Announcement Banner (if any) */}
        {recentlyCalledToken && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(139, 92, 246, 0.95))',
            borderRadius: '16px',
            padding: '20px 28px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 0 50px rgba(59, 130, 246, 0.5)',
            animation: 'pulse-border 2s infinite'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Bell size={38} color="#fbbf24" style={{ animation: 'float 1s infinite' }} />
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24' }}>
                  Attention Please • Token Called
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                  TOKEN {recentlyCalledToken.tokenNumber}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)' }}>Please Proceed To</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#34d399' }}>
                {recentlyCalledToken.counterName}
              </div>
            </div>
          </div>
        )}

        {/* Grid of Counters / Now Serving Cards */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{
            fontSize: '0.88rem',
            color: 'var(--accent-blue)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Sparkles size={16} />
            <span>Now Serving at Desks</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {counters.map((c) => {
              const isOpen = c.status === 'active';
              return (
                <div
                  key={c.counter_id}
                  style={{
                    background: isOpen ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.4)',
                    border: isOpen ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '18px',
                    padding: '24px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: isOpen ? '0 10px 30px rgba(0, 0, 0, 0.4)' : 'none'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px'
                  }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#93c5fd' }}>
                      {c.counter_name}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      background: isOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isOpen ? '#34d399' : '#f87171'
                    }}>
                      {c.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Token In Service
                  </div>

                  <div style={{
                    fontSize: '2.8rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-mono)',
                    color: isOpen ? '#ffffff' : 'var(--text-dim)',
                    marginTop: '4px',
                    letterSpacing: '-0.02em'
                  }}>
                    {c.current_token_number || (isOpen ? 'READY' : 'CLOSED')}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    {c.service_name || 'Department Desk'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Up Next Strip for Departments */}
        <div>
          <div style={{
            fontSize: '0.88rem',
            color: 'var(--text-dim)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Layers size={16} />
            <span>Up Next In Queue</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px'
          }}>
            {services.map((svc) => (
              <div
                key={svc.service_id}
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                    {svc.service_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
                    {svc.service_code}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>
                    {svc.current_queue_length}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Waiting
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Instructions Ticker */}
      <div style={{
        marginTop: '40px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        paddingTop: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.84rem',
        color: 'var(--text-dim)'
      }}>
        <span>Please watch this screen or monitor your mobile token for real-time announcements.</span>
        <span>GhostQueue Telemetry Active</span>
      </div>
    </div>
  );
}
