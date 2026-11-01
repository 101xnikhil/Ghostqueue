import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
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

  const loadMyTokens = async () => {
    if (isAuthenticated) {
      try {
        const res = await api.getMyTokens();
        if (res.success && res.tokens.length > 0) {
          setMyTokens(res.tokens);
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

  useEffect(() => {
    if (!socket || !activeTokenId) return;

    socket.emit('join:token', activeTokenId);

    const handleTokenCalled = () => {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
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

    const handleServiceStarted = () => fetchTokenDetails(activeTokenId);
    const handleServiceCompleted = () => {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
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
    setTimeout(() => setCopied(false), 2000);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting':
        return <span className="badge badge-waiting">Waiting in Queue</span>;
      case 'called':
        return <span className="badge badge-called">Called to Desk</span>;
      case 'in_service':
        return <span className="badge badge-serving">In Service</span>;
      case 'completed':
        return <span className="badge badge-completed">Completed</span>;
      case 'cancelled':
        return <span className="badge badge-cancelled">Cancelled</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="container" style={{ padding: '36px 24px 80px 24px', maxWidth: '780px' }}>
      {/* Top Header & Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Queue Pass
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Real-time status updates and counter call notifications.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px', width: '100%', maxWidth: '300px' }}>
          <input
            type="text"
            placeholder="Find by token ID or UUID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="form-input"
            style={{ padding: '7px 10px', fontSize: '0.82rem' }}
          />
          <button type="submit" className="btn-secondary" style={{ padding: '7px 12px', fontSize: '0.82rem' }}>
            Track
          </button>
        </form>
      </div>

      {/* Quick Token Selector Pills */}
      {myTokens.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Active:
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
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: isSelected ? 'var(--accent)' : 'rgba(255, 255, 255, 0.04)',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{t.token_number}</span>
                <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>({t.service_code})</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', color: 'var(--accent)' }} />
          <p style={{ fontSize: '0.86rem' }}>Fetching token details...</p>
        </div>
      ) : error || !tokenData ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
          <AlertCircle size={36} color="var(--text-tertiary)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '6px' }}>
            {error || 'No Token Selected'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '20px' }}>
            Select a service desk from the catalog to join a live queue.
          </p>
          <button onClick={() => openJoinModal()} className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.86rem' }}>
            <span>Join a Queue</span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div>
          {/* Main Ticket Card */}
          {(() => {
            const isCalled = tokenData.status === 'called';
            const isWaiting = tokenData.status === 'waiting';

            return (
              <div
                className="glass-panel"
                style={{
                  padding: '28px',
                  border: isCalled ? '1px solid var(--status-success)' : '1px solid var(--border-subtle)',
                  background: isCalled ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-surface)',
                  marginBottom: '20px'
                }}
              >
                {/* Called alert */}
                {isCalled && (
                  <div style={{
                    background: 'var(--status-success-bg)',
                    border: '1px solid var(--status-success-border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: 'var(--status-success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '22px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Bell size={18} />
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        It's your turn! Please proceed to <strong>{tokenData.counter_name || 'Desk'}</strong>.
                      </div>
                    </div>
                  </div>
                )}

                {/* Header: Service & Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: '#93c5fd',
                      background: 'var(--accent-light)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      marginRight: '8px'
                    }}>
                      {tokenData.service_code}
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                      {tokenData.service_name}
                    </span>
                  </div>

                  {getStatusBadge(tokenData.status)}
                </div>

                {/* Center Token Display */}
                <div style={{ textAlign: 'center', padding: '16px 0 24px 0' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Pass Number
                  </div>
                  <div style={{
                    fontSize: 'clamp(3rem, 7vw, 4.2rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    fontFamily: 'var(--font-mono)',
                    color: '#ffffff',
                    marginTop: '2px'
                  }}>
                    {tokenData.token_number}
                  </div>
                  {tokenData.user_name && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Visitor: <span style={{ color: '#ffffff' }}>{tokenData.user_name}</span>
                    </div>
                  )}
                </div>

                {/* Telemetry Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '20px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Rank in Line</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {isWaiting ? `#${tokenData.live_position || 1}` : '—'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                      {isWaiting ? `${tokenData.people_ahead || 0} ahead` : 'Serving'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Est. Wait</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#60a5fa', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {isWaiting ? `~${tokenData.estimated_wait_minutes ?? 5}m` : '0m'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                      Live prediction
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Desk</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: tokenData.counter_name ? '#34d399' : 'var(--text-secondary)', marginTop: '4px' }}>
                      {tokenData.counter_name || 'Standby'}
                    </div>
                  </div>
                </div>

                {/* Clean Progress Bar */}
                {isWaiting && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.max(10, Math.min(100, 100 - (tokenData.people_ahead * 20)))}%`,
                        background: 'var(--accent)',
                        borderRadius: '2px'
                      }} />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleCopyLink}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      {copied ? <Check size={14} color="var(--status-success)" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied' : 'Share Link'}</span>
                    </button>

                    <button
                      onClick={() => fetchTokenDetails(activeTokenId)}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>

                  {['waiting', 'called'].includes(tokenData.status) && (
                    <button
                      onClick={() => setCancelModalOpen(true)}
                      className="btn-danger"
                    >
                      <XCircle size={14} />
                      <span>Leave Queue</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Timeline Audit Events */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} color="var(--text-secondary)" />
              <span>Event Timeline</span>
            </h3>

            {tokenData.timeline && tokenData.timeline.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tokenData.timeline.map((evt, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#ffffff', textTransform: 'capitalize' }}>
                        {evt.event_type.replace(/_/g, ' ')}
                      </div>
                      {evt.counter_name && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          At {evt.counter_name}
                        </div>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Joined queue at {new Date(tokenData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '380px',
            width: '100%',
            padding: '22px',
            background: '#0e121b',
            border: '1px solid var(--border-medium)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
              Surrender Spot?
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Cancel token <strong>{tokenData?.token_number}</strong>?
            </p>

            <div style={{ marginBottom: '16px' }}>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.82rem' }}
              >
                <option value="Change of plans">Change of plans</option>
                <option value="Estimated wait too long">Estimated wait too long</option>
                <option value="Joined wrong department">Joined wrong department</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="btn-secondary"
                style={{ flex: 1, padding: '8px' }}
              >
                Keep
              </button>
              <button
                onClick={handleCancelToken}
                disabled={cancelling}
                className="btn-danger"
                style={{ flex: 1, padding: '8px' }}
              >
                {cancelling ? 'Cancelling...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
