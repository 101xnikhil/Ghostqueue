import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Sparkles, User, Lock, Mail, Phone, ShieldCheck, ArrowRight } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, initialTab = 'guest' }) {
  const { login, register, guestLogin, switchDemoRole } = useAuth();
  const [tab, setTab] = useState(initialTab); // 'guest', 'login', 'register'
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'guest') {
        if (!name.trim()) throw new Error('Please enter your name.');
        await guestLogin(name, phone);
      } else if (tab === 'login') {
        if (!email.trim() || !password) throw new Error('Please enter email and password.');
        await login(email, password);
      } else if (tab === 'register') {
        if (!name.trim() || !email.trim() || !password) throw new Error('Name, email and password are required.');
        await register({ name, email, password, phone });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role) => {
    setError('');
    setLoading(true);
    try {
      await switchDemoRole(role);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to switch demo role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '28px',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'var(--grad-primary)',
            marginBottom: '12px',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
          }}>
            <Sparkles size={24} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Welcome to GhostQueue
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Digital queueing, real-time telemetry & waiting prediction
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px',
          background: 'rgba(0,0,0,0.25)',
          padding: '4px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => { setTab('guest'); setError(''); }}
            style={{
              background: tab === 'guest' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              border: tab === 'guest' ? '1px solid rgba(59, 130, 246, 0.4)' : 'none',
              color: tab === 'guest' ? '#60a5fa' : 'var(--text-muted)',
              padding: '8px 4px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Guest Access
          </button>
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            style={{
              background: tab === 'login' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              border: tab === 'login' ? '1px solid rgba(59, 130, 246, 0.4)' : 'none',
              color: tab === 'login' ? '#60a5fa' : 'var(--text-muted)',
              padding: '8px 4px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            style={{
              background: tab === 'register' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              border: tab === 'register' ? '1px solid rgba(59, 130, 246, 0.4)' : 'none',
              color: tab === 'register' ? '#60a5fa' : 'var(--text-muted)',
              padding: '8px 4px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fda4af',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {(tab === 'guest' || tab === 'register') && (
            <div>
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>
          )}

          {(tab === 'login' || tab === 'register') && (
            <div>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="email"
                  required
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>
          )}

          {(tab === 'login' || tab === 'register') && (
            <div>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>
          )}

          {(tab === 'guest' || tab === 'register') && (
            <div>
              <label className="form-label">Phone Number (Optional for SMS / updates)</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '6px', height: '44px' }}
          >
            {loading ? 'Processing...' : (
              <>
                {tab === 'guest' ? 'Continue as Guest' : tab === 'login' ? 'Sign In to Account' : 'Create Free Account'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Demo Profiles */}
        <div style={{ marginTop: '22px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '10px', fontWeight: 600 }}>
            Instant Evaluation Demo Roles
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              style={{
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#c4b5fd',
                padding: '8px 4px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('operator')}
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#93c5fd',
                padding: '8px 4px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              💼 Operator 1
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('visitor')}
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#6ee7b7',
                padding: '8px 4px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🎟️ Visitor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
