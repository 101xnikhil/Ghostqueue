import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Clock, Users, ArrowRight, AlertCircle } from 'lucide-react';

export default function JoinModal({ isOpen, onClose, preselectedService = null, onTokenJoined }) {
  const { user, isAuthenticated } = useAuth();
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadServices();
      if (user) {
        setGuestName(user.name || '');
        setGuestPhone(user.phone || '');
      } else {
        setGuestName('');
        setGuestPhone('');
      }
      setError('');
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (preselectedService) {
      setSelectedServiceId(preselectedService.service_id);
    } else if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0].service_id);
    }
  }, [preselectedService, services]);

  const loadServices = async () => {
    try {
      const res = await api.getServices();
      if (res.success) {
        const active = res.services.filter(s => s.is_active);
        setServices(active);
        if (!preselectedService && active.length > 0) {
          setSelectedServiceId(active[0].service_id);
        }
      }
    } catch (err) {
      console.error('Failed to load services for join modal:', err);
    }
  };

  if (!isOpen) return null;

  const currentService = services.find(s => s.service_id === selectedServiceId) || preselectedService;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedServiceId) {
      setError('Please select a service.');
      return;
    }

    if (!isAuthenticated && !guestName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.joinQueue({
        serviceId: selectedServiceId,
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined
      });

      if (res.success && res.token) {
        if (onTokenJoined) {
          onTokenJoined(res.token);
        }
        onClose();
      } else {
        setError(res.message || 'Failed to join queue.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while joining the queue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#0e121b',
          border: '1px solid var(--border-medium)',
          borderRadius: '12px',
          padding: '24px',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
            Enter Queue
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Select a department desk to receive a digital pass.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: '#f87171',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Department Select */}
          <div style={{ marginBottom: '14px' }}>
            <label className="form-label">Department Window</label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.86rem' }}
            >
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id}>
                  {s.service_name} ({s.service_code})
                </option>
              ))}
            </select>
          </div>

          {/* Quick preview info */}
          {currentService && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Waiting ahead: </span>
                <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{currentService.current_queue_length ?? 0}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Est. wait: </span>
                <strong style={{ color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>~{currentService.estimated_wait_time ?? 5}m</strong>
              </div>
            </div>
          )}

          {/* Name */}
          <div style={{ marginBottom: '14px' }}>
            <label className="form-label">
              Your Name {isAuthenticated ? '(Logged in)' : '*'}
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Morgan"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required={!isAuthenticated}
              disabled={isAuthenticated}
              className="form-input"
              style={{ fontSize: '0.86rem' }}
            />
          </div>

          {/* Phone */}
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">Mobile Number (Optional)</label>
            <input
              type="tel"
              placeholder="+1 555-0199"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.86rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ flex: 1, padding: '8px', fontSize: '0.86rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ flex: 2, padding: '8px', fontSize: '0.86rem' }}
            >
              {loading ? 'Creating...' : 'Get Digital Pass'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
