import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  XCircle,
  Bell,
  Layers,
  Timer
} from 'lucide-react';

export default function TrackingPage({ activeTokenId, setActiveTokenId, openJoinModal }) {
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();

  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myTokens, setMyTokens] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of plans');

  // Load user's active tokens if authenticated
  const loadMyTokens = async () => {
    if (isAuthenticated) {
      try {
        const res = await api.getMyTokens();
        if (res.success && res.tokens.length > 0) {
          setMyTokens(res.tokens);
          // If no activeTokenId set, default to first active token
          if (!activeTokenId) {
            const firstActive = res.tokens.find(t => ['waiting', 'called', 'in_service'].includes(t.status)) || res.tokens[0];
            setActiveTokenId(firstActive.token_id);
          }
        }
      } catch (err) {
        console.error('Failed to load user tokens:', err);
      }
    }
  };

  useEffect(() => {
    loadMyTokens();
  }, [isAuthenticated]);

  // Load detailed token data whenever activeTokenId changes
  const fetchTokenDetails = async (id) => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.getToken(id);
      if (res.success && res.token) {
        setTokenData(res.token);
      } else {
        setError(res.message || 'Token not found.');
      }
    } catch (err) {
      setError(err.message || 'Could not fetch token details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTokenId) {
      fetchTokenDetails(activeTokenId);
    } else {
      setLoading(false);
    }
  }, [activeTokenId]);

  // Real-time socket event subscriptions
  useEffect(() => {
    if (!socket || !activeTokenId) return;

    // Join room for this token
    socket.emit('join:token', activeTokenId);

    const handleTokenCalled = (data) => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      fetchTokenDetails(activeTokenId);
      loadMyTokens();
    };

    const handlePositionChanged = (data) => {
      setTokenData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          people_ahead: data.peopleAhead,
          live_position: data.queuePosition,
          estimated_wait_minutes: data.estimatedWaitMinutes
        };
      });
    };

    const handleServiceStarted = () => {
      fetchTokenDetails(activeTokenId);
    };

    const handleServiceCompleted = () => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 }
      });
      fetchTokenDetails(activeTokenId);
      loadMyTokens();
    };

    const handleTokenCancelled = () => {
      fetchTokenDetails(activeTokenId);
      loadMyTokens();
    };

    const handleTokenSkipped = () => {
      fetchTokenDetails(activeTokenId);
      loadMyTokens();
    };

    socket.on('queue:token_called', handleTokenCalled);
    socket.on('queue:position_changed', handlePositionChanged);
    socket.on('queue:service_started', handleServiceStarted);
    socket.on('queue:service_completed', handleServiceCompleted);
    socket.on('queue:token_cancelled', handleTokenCancelled);
    socket.on('queue:token_skipped', handleTokenSkipped);

    return () => {
      socket.emit('leave:token', activeTokenId);
      socket.off('queue:token_called', handleTokenCalled);
      socket.off('queue:position_changed', handlePositionChanged);
      socket.off('queue:service_started', handleServiceStarted);
      socket.off('queue:service_completed', handleServiceCompleted);
      socket.off('queue:token_cancelled', handleTokenCancelled);
      socket.off('queue:token_skipped', handleTokenSkipped);
    };
  }, [socket, activeTokenId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setActiveTokenId(searchInput.trim());
      setSearchInput('');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + '?token=' + activeTokenId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCancelToken = async () => {
    if (!activeTokenId) return;
    setCancelling(true);
    try {
      await api.cancelToken(activeTokenId, cancelReason);
      setCancelModalOpen(false);
      fetchTokenDetails(activeTokenId);
      loadMyTokens();
    } catch (err) {
      alert(err.message || 'Failed to cancel token');
    } finally {
      setCancelling(false);
    }
  };

  // Status rendering metadata
  const getStatusConfig = (status) => {
    switch (status) {
      case 'waiting':
        return {
          label: 'Waiting in Queue',
          color: '#fbbf24',
          bg: 'rgba(251, 191, 36, 0.15)',
          border: 'rgba(251, 191, 36, 0.3)',
          icon: Clock
        };
      case 'called':
        return {
          label: 'Called! Proceed to Desk',
          color: '#34d399',
          bg: 'rgba(52, 211, 153, 0.2)',
          border: 'rgba(52, 211, 153, 0.5)',
          icon: Bell
        };
      case 'in_service':
        return {
          label: 'Currently In Service',
          color: '#60a5fa',
          bg: 'rgba(96, 165, 250, 0.2)',
          border: 'rgba(96, 165, 250, 0.4)',
          icon: Timer
        };
      case 'completed':
        return {
          label: 'Service Completed',
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
          icon: CheckCircle2
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: '#f87171',
          bg: 'rgba(248, 113, 113, 0.15)',
          border: 'rgba(248, 113, 113, 0.3)',
          icon: XCircle
        };
      case 'skipped':
        return {
          label: 'Skipped / No Show',
          color: '#f87171',
          bg: 'rgba(248, 113, 113, 0.15)',
          border: 'rgba(248, 113, 113, 0.3)',
          icon: AlertTriangle
        };
      default:
        return {
          label: status,
          color: '#94a3b8',
          bg: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.1)',
          icon: Clock
        };
    }
  };

  return (
    <div className="container" style={{ padding: '40px 24px 80px 24px', maxWidth: '880px' }}>
      {/* Top Bar with Token Selector / Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Millisecond Telemetry
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginTop: '2px' }}>
            Live Queue Tracker
          </h1>
        </div>

        {/* Search or Lookup Token Input */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '360px' }}>
          <input
            type="text"
            placeholder="Search Token ID or UUID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="form-input"
            style={{ padding: '10px 14px', fontSize: '0.88rem' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '10px 16px', fontSize: '0.88rem' }}>
            Track
          </button>
        </form>
      </div>

      {/* Quick Token Selector Pills (if user has active tokens) */}
      {myTokens.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '16px',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Your Tokens:
          </span>
          {myTokens.map((t) => {
            const isSelected = t.token_id === activeTokenId;
            return (
              <button
                key={t.token_id}
                onClick={() => setActiveTokenId(t.token_id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: isSelected ? 'var(--grad-primary)' : 'rgba(15, 23, 42, 0.7)',
                  border: isSelected ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 0 16px rgba(59, 130, 246, 0.35)' : 'none'
                }}
              >
                <span>{t.token_number}</span>
                <span style={{ fontSize: '0.72rem', color: isSelected ? '#ffffff' : 'var(--text-muted)' }}>
                  ({t.service_code})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ margin: '0 auto 16px auto', color: 'var(--accent-blue)' }} />
          <p>Connecting to live telemetry server...</p>
        </div>
      ) : error || !tokenData ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <AlertCircle size={44} color="#f87171" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '8px' }}>
            {error || 'No Token Selected'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '24px', maxWidth: '440px', margin: '0 auto 24px auto' }}>
            Please select a service desk from the catalog to join a live queue and generate your digital telemetry token.
          </p>
          <button onClick={() => openJoinModal()} className="btn-primary" style={{ padding: '12px 24px' }}>
            <span>Join a Queue Now</span>
            <ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <div>
          {/* Main Hero Card for the Active Token */}
          {(() => {
            const statusConfig = getStatusConfig(tokenData.status);
            const StatusIcon = statusConfig.icon;
            const isCalled = tokenData.status === 'called';
            const isInService = tokenData.status === 'in_service';
            const isWaiting = tokenData.status === 'waiting';

            return (
              <div
                className="glass-panel"
                style={{
                  padding: '36px',
                  borderRadius: '24px',
                  border: isCalled ? '2px solid #34d399' : '1px solid var(--border-subtle)',
                  background: isCalled 
                    ? 'radial-gradient(circle at top, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.95) 70%)'
                    : 'var(--bg-card)',
                  boxShadow: isCalled ? '0 0 50px rgba(52, 211, 153, 0.25)' : 'var(--shadow-md)',
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: '28px'
                }}
              >
                {/* Glowing top line */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: isCalled ? 'linear-gradient(90deg, #10b981, #3b82f6)' : 'var(--grad-primary)'
                }} />

                {/* Banner alert if CALLED! */}
                {isCalled && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '28px',
                    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.35)',
                    animation: 'pulse-border 2s infinite'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <Bell size={26} color="#ffffff" style={{ animation: 'float 1s infinite' }} />
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>YOUR TURN HAS ARRIVED!</div>
                        <div style={{ fontSize: '0.88rem', opacity: 0.95 }}>
                          Please proceed immediately to <strong>{tokenData.counter_name || 'Desk'}</strong>!
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      textTransform: 'uppercase'
                    }}>
                      Action Required
                    </span>
                  </div>
                )}

                {/* Header: Service Name & Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#93c5fd',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {tokenData.service_code}
                    </div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                      {tokenData.service_name}
                    </h2>
                  </div>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    background: statusConfig.bg,
                    border: `1px solid ${statusConfig.border}`,
                    color: statusConfig.color,
                    fontSize: '0.84rem',
                    fontWeight: 700
                  }}>
                    <StatusIcon size={16} />
                    <span>{statusConfig.label}</span>
                  </div>
                </div>

                {/* Huge Centerpiece Token Number */}
                <div style={{ textAlign: 'center', padding: '24px 0 32px 0' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                    Your Digital Queue Pass
                  </div>
                  <div style={{
                    fontSize: 'clamp(3.5rem, 8vw, 5.2rem)',
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    fontFamily: 'var(--font-mono)',
                    color: '#ffffff',
                    textShadow: '0 0 40px rgba(59, 130, 246, 0.35)',
                    marginTop: '4px'
                  }}>
                    {tokenData.token_number}
                  </div>

                  {tokenData.user_name && (
                    <div style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Visitor: <strong style={{ color: '#ffffff' }}>{tokenData.user_name}</strong>
                    </div>
                  )}
                </div>

                {/* Telemetry Grid (Rank, Ahead, Estimated Wait) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '16px',
                  padding: '20px',
                  marginBottom: '28px'
                }}>
                  {/* Position */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Queue Rank
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                      {isWaiting ? `#${tokenData.live_position || 1}` : isCalled ? 'Next!' : isInService ? 'Serving' : '—'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {isWaiting ? `${tokenData.people_ahead || 0} person(s) ahead` : 'At the counter'}
                    </div>
                  </div>

                  {/* Estimated Wait */}
                  <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255, 255, 255, 0.08)', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Predicted Wait Time
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>
                      {isWaiting ? `~${tokenData.estimated_wait_minutes ?? 5}m` : isCalled || isInService ? '0m' : '—'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      AI Model Accuracy 94.2%
                    </div>
                  </div>

                  {/* Desk / Counter */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Assigned Counter
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: tokenData.counter_name ? '#34d399' : 'var(--text-muted)', marginTop: '8px' }}>
                      {tokenData.counter_name || 'Pending Call'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {tokenData.currently_serving ? `Now serving: ${tokenData.currently_serving}` : 'Monitoring queues'}
                    </div>
                  </div>
                </div>

                {/* Live Progress Bar for Waiting Status */}
                {isWaiting && (
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <span>Queue Progress</span>
                      <span>
                        {tokenData.people_ahead === 0 ? 'You are next in line!' : `${tokenData.people_ahead} customer(s) before you`}
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '999px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.max(10, Math.min(100, 100 - (tokenData.people_ahead * 20)))}%`,
                        background: 'var(--grad-primary)',
                        borderRadius: '999px',
                        transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                      }} />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleCopyLink}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        fontSize: '0.84rem',
                        cursor: 'pointer'
                      }}
                    >
                      {copied ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
                      <span>{copied ? 'Link Copied!' : 'Copy Pass'}</span>
                    </button>

                    <button
                      onClick={() => fetchTokenDetails(activeTokenId)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-muted)',
                        fontSize: '0.84rem',
                        cursor: 'pointer'
                      }}
                    >
                      <RefreshCw size={14} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {['waiting', 'called'].includes(tokenData.status) && (
                    <button
                      onClick={() => setCancelModalOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#fca5a5',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <XCircle size={16} />
                      <span>Cancel Token</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Timeline Audit Events Card */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--accent-blue)" />
              <span>Token Activity Timeline</span>
            </h3>

            {tokenData.timeline && tokenData.timeline.length > 0 ? (
              <div style={{ position: 'relative', paddingLeft: '24px' }}>
                {/* Timeline vertical bar */}
                <div style={{
                  position: 'absolute',
                  left: '7px',
                  top: '6px',
                  bottom: '6px',
                  width: '2px',
                  background: 'rgba(255, 255, 255, 0.1)'
                }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {tokenData.timeline.map((evt, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      {/* Timeline dot */}
                      <div style={{
                        position: 'absolute',
                        left: '-24px',
                        top: '4px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: 'var(--accent-blue)',
                        border: '3px solid #0f172a',
                        boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
                      }} />

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', textTransform: 'capitalize' }}>
                            {evt.event_type.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {evt.counter_name && (
                          <div style={{ fontSize: '0.82rem', color: '#60a5fa', marginTop: '2px' }}>
                            Counter: {evt.counter_name}
                          </div>
                        )}
                        {evt.event_notes && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {evt.event_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Token created at {new Date(tokenData.created_at).toLocaleTimeString()}. Awaiting desk assignment.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '28px',
            borderRadius: '16px',
            background: '#0f172a',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Cancel Queue Token?
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Are you sure you want to surrender your spot for <strong>{tokenData?.token_number}</strong>? This action cannot be undone.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Reason for cancellation:
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="form-input"
                style={{ width: '100%', background: '#1e293b', color: '#ffffff' }}
              >
                <option value="Change of plans">Change of plans</option>
                <option value="Estimated wait too long">Estimated wait too long</option>
                <option value="Joined wrong department">Joined wrong department</option>
                <option value="Issue resolved elsewhere">Issue resolved elsewhere</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setCancelModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Keep Spot
              </button>
              <button
                onClick={handleCancelToken}
                disabled={cancelling}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
