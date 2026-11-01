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
  UserCheck
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

  const loadCounters = async () => {
    try {
      const res = await api.getCounters();
      if (res.success && res.counters.length > 0) {
        setCounters(res.counters);
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

  useEffect(() => {
    if (!socket || !selectedCounterId) return;

    socket.emit('join:counter', selectedCounterId);

    const handleTokenChanged = () => loadCounterState(selectedCounterId);
    const handleStatusChanged = () => loadCounterState(selectedCounterId);
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
      {/* Role Reminder if visitor */}
      {role === 'visitor' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-medium)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Viewing as Visitor. Switch to Operator demo account to issue desk commands:
          </span>
          <button
            onClick={() => switchDemoRole('operator')}
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Switch to Operator
          </button>
        </div>
      )}

      {/* Header & Desk Switcher */}
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
            Operator Terminal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
            Desk queue control and customer service flow.
          </p>
        </div>

        {/* Counter Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={selectedCounterId}
            onChange={(e) => setSelectedCounterId(e.target.value)}
            className="form-input"
            style={{
              padding: '7px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: '#0e121b',
              cursor: 'pointer'
            }}
          >
            {counters.map((c) => (
              <option key={c.counter_id} value={c.counter_id}>
                {c.counter_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--status-danger-bg)',
          border: '1px solid var(--status-danger-border)',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#f87171',
          fontSize: '0.84rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Layout Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* Left Column: Counter Controls & Active Customer */}
        <div>
          {/* Status Bar */}
          <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: currentCounter?.status === 'active' ? 'var(--status-success)' : currentCounter?.status === 'paused' ? 'var(--status-warning)' : 'var(--status-danger)'
                }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ffffff', textTransform: 'capitalize' }}>
                  {currentCounter?.status || 'Active'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleStatusChange('active')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '5px',
                    background: currentCounter?.status === 'active' ? 'var(--status-success-bg)' : 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: currentCounter?.status === 'active' ? 'var(--status-success)' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Open
                </button>
                <button
                  onClick={() => handleStatusChange('paused')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '5px',
                    background: currentCounter?.status === 'paused' ? 'var(--status-warning-bg)' : 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: currentCounter?.status === 'paused' ? 'var(--status-warning)' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Break
                </button>
                <button
                  onClick={() => handleStatusChange('closed')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '5px',
                    background: currentCounter?.status === 'closed' ? 'var(--status-danger-bg)' : 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: currentCounter?.status === 'closed' ? '#f87171' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* Active Customer Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            {activeToken ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span className={`badge ${activeToken.status === 'in_service' ? 'badge-serving' : 'badge-called'}`}>
                    {activeToken.status === 'in_service' ? 'Serving Customer' : 'Customer Called'}
                  </span>

                  {activeToken.status === 'in_service' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <Clock size={14} />
                      <span>{formatTimer(elapsedSeconds)}</span>
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'center', padding: '12px 0 18px 0' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Token Number</div>
                  <div style={{
                    fontSize: '3rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '-0.02em'
                  }}>
                    {activeToken.token_number}
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}>
                    {activeToken.user_name || activeToken.guest_name || 'Guest'}
                  </div>
                </div>

                {activeToken.status === 'in_service' && (
                  <div style={{ marginBottom: '16px' }}>
                    <textarea
                      rows={2}
                      placeholder="Service notes (optional)..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.82rem', resize: 'none' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  {activeToken.status === 'called' ? (
                    <>
                      <button
                        onClick={handleStartService}
                        disabled={actionLoading}
                        className="btn-primary"
                        style={{ flex: 2, padding: '10px' }}
                      >
                        <Play size={15} />
                        <span>Start Service</span>
                      </button>

                      <button
                        onClick={() => setSkipModalOpen(true)}
                        disabled={actionLoading}
                        className="btn-secondary"
                        style={{ flex: 1, padding: '10px' }}
                      >
                        <SkipForward size={14} />
                        <span>Skip</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCompleteService}
                      disabled={actionLoading}
                      className="btn-primary"
                      style={{ width: '100%', padding: '10px', background: 'var(--status-success)' }}
                    >
                      <CheckCircle2 size={16} />
                      <span>{actionLoading ? 'Saving...' : 'Finish Service'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto'
                }}>
                  <UserCheck size={20} color="var(--text-secondary)" />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  Window Ready
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '20px' }}>
                  {waitingQueue.length > 0
                    ? `${waitingQueue.length} visitor(s) waiting in queue.`
                    : 'No visitors in queue.'}
                </p>

                <button
                  onClick={handleCallNext}
                  disabled={actionLoading || waitingQueue.length === 0}
                  className="btn-primary"
                  style={{ padding: '10px 24px', fontSize: '0.9rem' }}
                >
                  <span>{actionLoading ? 'Calling...' : 'Call Next Customer'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Waiting List */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="var(--text-secondary)" />
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>
                Waiting in Department
              </h3>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {waitingQueue.length} in line
            </span>
          </div>

          {waitingQueue.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', textAlign: 'center', padding: '28px 0' }}>
              No customers waiting.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {waitingQueue.map((item, idx) => (
                <div
                  key={item.token_id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      #{idx + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                        {item.token_number}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        {item.user_name || item.guest_name || 'Guest'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.76rem', color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
                      ~{item.estimated_wait_minutes ?? 5}m
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
          background: 'rgba(0,0,0,0.7)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '360px',
            width: '100%',
            padding: '20px',
            background: '#0e121b',
            border: '1px solid var(--border-medium)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
              Skip Token {activeToken?.token_number}?
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Mark as skipped and log reason in audit history.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <select
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.82rem' }}
              >
                <option value="Customer did not appear">Customer did not appear</option>
                <option value="Customer asked to be skipped">Customer asked to be skipped</option>
                <option value="Incomplete documents">Incomplete documents</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSkipModalOpen(false)}
                className="btn-secondary"
                style={{ flex: 1, padding: '7px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSkipToken}
                disabled={actionLoading}
                className="btn-danger"
                style={{ flex: 1, padding: '7px' }}
              >
                {actionLoading ? 'Skipping...' : 'Skip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
