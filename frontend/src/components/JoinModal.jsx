import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Clock, Users, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

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
      background: 'rgba(3, 7, 18, 0.8)',
      backdropFilter: 'blur(10px)',
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
          maxWidth: '520px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(59, 130, 246, 0.2)',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--grad-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
          }}>
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              Join Digital Queue
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Instant wait-time prediction & live telemetry token
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '12px 16px',
            color: '#fca5a5',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Service Selector */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Department / Service Desk
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(15, 23, 42, 0.9)',
                color: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                fontSize: '0.92rem',
                cursor: 'pointer'
              }}
            >
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id} style={{ background: '#0f172a' }}>
                  {s.service_name} ({s.service_code})
                </option>
              ))}
            </select>
          </div>

          {/* Telemetry Preview for Selected Service */}
          {currentService && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={18} color="#fbbf24" />
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Waiting Ahead</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24' }}>
                    {currentService.current_queue_length ?? 0} people
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'right' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Predicted Wait</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#60a5fa' }}>
                    ~{currentService.estimated_wait_time ?? 5} mins
                  </div>
                </div>
                <Clock size={18} color="#60a5fa" />
              </div>
            </div>
          )}

          {/* Name Field (if not authenticated) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Your Full Name {isAuthenticated ? '(Logged in)' : '*'}
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Morgan"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required={!isAuthenticated}
              disabled={isAuthenticated}
              className="form-input"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: isAuthenticated ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.9)',
                color: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                fontSize: '0.92rem'
              }}
            />
          </div>

          {/* Phone Field for SMS / WhatsApp Notification */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Mobile Number (Optional for SMS / Alert telemetry)
            </label>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(15, 23, 42, 0.9)',
                color: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                fontSize: '0.92rem'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.95rem'
              }}
            >
              {loading ? 'Generating Token...' : 'Get Queue Token'}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
