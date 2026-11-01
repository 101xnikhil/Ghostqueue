import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Users,
  Play,
  CheckCircle2,
  SkipForward,
  Pause,
  Power,
  Clock,
  AlertCircle,
  UserCheck,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export default function OperatorPage() {
  const { user, role, switchDemoRole } = useAuth();
  const { socket } = useSocket();

  const [counters, setCounters] = useState([]);
  const [selectedCounterId, setSelectedCounterId] = useState('');
  const [counterState, setCounterState] = useState(null);
  const [waitingQueue, setWaitingQueue] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('Customer did not appear');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Load all counters
  const loadCounters = async () => {
    try {
      const res = await api.getCounters();
      if (res.success && res.counters.length > 0) {
        setCounters(res.counters);
        // Default to first counter or the one assigned to this operator
        if (!selectedCounterId) {
          const assigned = res.counters.find(c => c.operator_id === user?.user_id) || res.counters[0];
          setSelectedCounterId(assigned.counter_id);
        }
      }
    } catch (err) {
      console.error('Failed to load counters:', err);
    }
  };

  useEffect(() => {
    loadCounters();
  }, [user]);

  // Load state of selected counter
  const loadCounterState = async (counterId) => {
    if (!counterId) return;
    try {
      const res = await api.getCounterState(counterId);
      if (res.success) {
        setCounterState(res);
        if (res.counter && res.counter.service_id) {
          loadServiceQueue(res.counter.service_id);
        }
      }
    } catch (err) {
      console.error('Failed to load counter state:', err);
    }
  };

  // Load waiting queue for current service
  const loadServiceQueue = async (serviceId) => {
    try {
      const res = await api.getServiceQueue(serviceId);
      if (res.success) {
        setWaitingQueue(res.queue || []);
      }
    } catch (err) {
      console.error('Failed to load service queue:', err);
    }
  };

  useEffect(() => {
    if (selectedCounterId) {
      loadCounterState(selectedCounterId);
    }
  }, [selectedCounterId]);

  // Live timer for active in_service customer
  useEffect(() => {
    let interval = null;
    const currentToken = counterState?.token;
    if (currentToken && currentToken.status === 'in_service' && currentToken.service_started_at) {
      const startTime = new Date(currentToken.service_started_at).getTime();
      interval = setInterval(() => {
        const now = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((now - startTime) / 1000)));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [counterState?.token]);

  // Real-time socket subscriptions for counter & service
  useEffect(() => {
    if (!socket || !selectedCounterId) return;

    socket.emit('join:counter', selectedCounterId);

    const handleTokenChanged = () => {
      loadCounterState(selectedCounterId);
    };

    const handleStatusChanged = () => {
      loadCounterState(selectedCounterId);
    };

    const handleQueueUpdated = () => {
      if (counterState?.counter?.service_id) {
        loadServiceQueue(counterState.counter.service_id);
      }
    };

    socket.on('counter:token_changed', handleTokenChanged);
    socket.on('counter:status_changed', handleStatusChanged);
    socket.on('queue:updated', handleQueueUpdated);

    return () => {
      socket.off('counter:token_changed', handleTokenChanged);
      socket.off('counter:status_changed', handleStatusChanged);
      socket.off('queue:updated', handleQueueUpdated);
    };
  }, [socket, selectedCounterId, counterState?.counter?.service_id]);

  // Operator Actions
  const handleCallNext = async () => {
    setError('');
    setActionLoading(true);
    try {
      const res = await api.callNext(selectedCounterId);
      if (res.success) {
        loadCounterState(selectedCounterId);
      }
    } catch (err) {
      setError(err.message || 'Failed to call next token.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartService = async () => {
    if (!counterState?.token?.token_id) return;
    setError('');
    setActionLoading(true);
    try {
      const res = await api.startService(counterState.token.token_id, selectedCounterId);
      if (res.success) {
        loadCounterState(selectedCounterId);
      }
    } catch (err) {
      setError(err.message || 'Failed to start service.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteService = async () => {
    if (!counterState?.token?.token_id) return;
    setError('');
    setActionLoading(true);
    try {
      const res = await api.completeService(counterState.token.token_id, selectedCounterId, notes);
      if (res.success) {
        setNotes('');
        loadCounterState(selectedCounterId);
      }
    } catch (err) {
      setError(err.message || 'Failed to complete service.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkipToken = async () => {
    if (!counterState?.token?.token_id) return;
    setError('');
    setActionLoading(true);
    try {
      const res = await api.skipToken(counterState.token.token_id, selectedCounterId, skipReason);
      if (res.success) {
        setSkipModalOpen(false);
        loadCounterState(selectedCounterId);
      }
    } catch (err) {
      setError(err.message || 'Failed to skip token.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.setCounterStatus(selectedCounterId, newStatus);
      loadCounterState(selectedCounterId);
      loadCounters();
    } catch (err) {
      setError(err.message || 'Failed to update counter status.');
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentCounter = counters.find(c => c.counter_id === selectedCounterId);
  const activeToken = counterState?.token;

  return (
    <div className="container" style={{ padding: '36px 24px 80px 24px' }}>
      {/* Role Notice & Demo Switcher if user is not Operator/Admin */}
      {role === 'visitor' && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={22} color="#fbbf24" />
            <div>
              <div style={{ fontWeight: 700, color: '#fef3c7' }}>Visitor Mode Detected</div>
              <div style={{ fontSize: '0.85rem', color: '#fde68a' }}>
                You are viewing the Operator Station. Switch to the demo Operator or Admin account to issue commands.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => switchDemoRole('operator')}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.84rem' }}
            >
              Switch to Operator
            </button>
            <button
              onClick={() => switchDemoRole('admin')}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Switch to Admin
            </button>
          </div>
        </div>
      )}

      {/* Header & Counter Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Staff Telemetry Console
          </span>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginTop: '2px' }}>
            Operator Station
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Manage queue flow, call visitors, and record service duration in real-time.
          </p>
        </div>

        {/* Counter Selection Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Operating Desk</div>
            <select
              value={selectedCounterId}
              onChange={(e) => setSelectedCounterId(e.target.value)}
              className="form-input"
              style={{
                padding: '10px 16px',
                fontWeight: 700,
                fontSize: '0.92rem',
                background: '#0f172a',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              {counters.map((c) => (
                <option key={c.counter_id} value={c.counter_id}>
                  {c.counter_name} ({c.service_name || 'Counter ' + c.counter_number})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '12px 18px',
          color: '#fca5a5',
          fontSize: '0.88rem',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Operator Layout Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column: Counter Controls & Current Customer Card */}
        <div>
          {/* Counter Status Toolbar */}
          <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Counter Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: currentCounter?.status === 'active' ? '#10b981' : currentCounter?.status === 'paused' ? '#fbbf24' : '#ef4444'
                  }} />
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', textTransform: 'capitalize' }}>
                    {currentCounter?.status || 'Active'}
                  </span>
                </div>
              </div>

              {/* Status Switcher Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleStatusChange('active')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: currentCounter?.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: currentCounter?.status === 'active' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                    color: currentCounter?.status === 'active' ? '#34d399' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Play size={14} /> Open
                </button>

                <button
                  onClick={() => handleStatusChange('paused')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: currentCounter?.status === 'paused' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: currentCounter?.status === 'paused' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                    color: currentCounter?.status === 'paused' ? '#fbbf24' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Pause size={14} /> Break
                </button>

                <button
                  onClick={() => handleStatusChange('closed')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: currentCounter?.status === 'closed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: currentCounter?.status === 'closed' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                    color: currentCounter?.status === 'closed' ? '#f87171' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Power size={14} /> Close
                </button>
              </div>
            </div>
          </div>

          {/* Active Serving Customer Card */}
          <div
            className="glass-panel"
            style={{
              padding: '32px',
              borderRadius: '20px',
              border: activeToken ? '1px solid rgba(59, 130, 246, 0.4)' : '1px dashed var(--border-subtle)',
              background: activeToken ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.5)',
              position: 'relative'
            }}
          >
            {activeToken ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: activeToken.status === 'in_service' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                    color: activeToken.status === 'in_service' ? '#34d399' : '#fbbf24',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}>
                    {activeToken.status === 'in_service' ? '● In Service' : '● Called to Desk'}
                  </div>

                  {activeToken.status === 'in_service' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-mono)',
                      color: '#60a5fa',
                      fontWeight: 700
                    }}>
                      <Clock size={16} />
                      <span>{formatTimer(elapsedSeconds)}</span>
                    </div>
                  )}
                </div>

                {/* Token Number Display */}
                <div style={{ textAlign: 'center', padding: '16px 0 24px 0' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Active Customer</div>
                  <div style={{
                    fontSize: '3.6rem',
                    fontWeight: 900,
                    color: '#ffffff',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '-0.02em',
                    textShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
                  }}>
                    {activeToken.token_number}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginTop: '4px' }}>
                    {activeToken.user_name || activeToken.guest_name || 'Walk-in Guest'}
                  </div>
                  {activeToken.user_phone && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      Phone: {activeToken.user_phone}
                    </div>
                  )}
                </div>

                {/* Completion Notes Input */}
                {activeToken.status === 'in_service' && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>
                      Service Notes / Remarks (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Verified enrollment documents, issued clearance..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', resize: 'none', fontSize: '0.85rem' }}
                    />
                  </div>
                )}

                {/* Action Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: activeToken.status === 'called' ? '2fr 1fr' : '1fr', gap: '12px' }}>
                  {activeToken.status === 'called' ? (
                    <>
                      <button
                        onClick={handleStartService}
                        disabled={actionLoading}
                        className="btn-primary"
                        style={{ height: '48px', fontSize: '1rem', fontWeight: 700 }}
                      >
                        <Play size={18} />
                        <span>Start Service</span>
                      </button>

                      <button
                        onClick={() => setSkipModalOpen(true)}
                        disabled={actionLoading}
                        style={{
                          height: '48px',
                          borderRadius: '10px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#fca5a5',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <SkipForward size={16} />
                        <span>Skip</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCompleteService}
                      disabled={actionLoading}
                      style={{
                        height: '48px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '1rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 25px rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      <CheckCircle2 size={20} />
                      <span>{actionLoading ? 'Saving...' : 'Complete Service & Close'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* No Active Customer: Prominent Call Next button */
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}>
                  <UserCheck size={32} color="#60a5fa" />
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                  Ready for Next Customer
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px', maxWidth: '340px', margin: '0 auto 24px auto' }}>
                  {waitingQueue.length > 0 
                    ? `${waitingQueue.length} customer(s) waiting in queue for this desk.`
                    : 'No customers currently waiting in this department queue.'}
                </p>

                <button
                  onClick={handleCallNext}
                  disabled={actionLoading || waitingQueue.length === 0}
                  className="btn-primary"
                  style={{
                    padding: '14px 32px',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)'
                  }}
                >
                  <Sparkles size={20} />
                  <span>{actionLoading ? 'Calling...' : 'Call Next Customer'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Waiting Queue List for this Service */}
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={20} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                Department Queue
              </h3>
            </div>
            <span style={{
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#93c5fd',
              fontSize: '0.8rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '8px'
            }}>
              {waitingQueue.length} Waiting
            </span>
          </div>

          {waitingQueue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
              <p>Queue is clear! No pending visitors.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto' }}>
              {waitingQueue.map((item, idx) => (
                <div
                  key={item.token_id}
                  style={{
                    background: idx === 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                    border: idx === 0 ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: idx === 0 ? '#60a5fa' : 'var(--text-dim)',
                      width: '24px'
                    }}>
                      #{idx + 1}
                    </span>
                    <div>
                      <div style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {item.token_number}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {item.user_name || item.guest_name || 'Guest'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600 }}>
                      ~{item.estimated_wait_minutes ?? 5}m wait
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      Joined {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skip Confirmation Modal */}
      {skipModalOpen && (
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
            maxWidth: '420px',
            width: '100%',
            padding: '28px',
            borderRadius: '16px',
            background: '#0f172a',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Skip Token {activeToken?.token_number}?
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Mark this visitor as skipped. Reason will be logged in audit telemetry.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Reason:
              </label>
              <select
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                className="form-input"
                style={{ width: '100%', background: '#1e293b', color: '#ffffff' }}
              >
                <option value="Customer did not appear">Customer did not appear</option>
                <option value="Customer asked to be skipped">Customer asked to be skipped</option>
                <option value="Incomplete paperwork">Incomplete paperwork</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSkipModalOpen(false)}
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
                Cancel
              </button>
              <button
                onClick={handleSkipToken}
                disabled={actionLoading}
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
                {actionLoading ? 'Skipping...' : 'Confirm Skip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
