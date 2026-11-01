import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Shield, 
  Tv, 
  Ticket, 
  Zap,
  ShieldCheck
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const { login, register, guestLogin, switchDemoRole } = useAuth();
  const [tab, setTab] = useState(initialTab); // 'login', 'register', 'guest'
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter your email and password.');
        }
        await login(email.trim(), password);
      } else if (tab === 'register') {
        if (!name.trim() || !email.trim() || !password) {
          throw new Error('Name, email, and password are required.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        await register({ name: name.trim(), email: email.trim(), password, phone: phone.trim() });
      } else if (tab === 'guest') {
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }
        await guestLogin(name.trim(), phone.trim());
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
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
      background: 'rgba(4, 6, 11, 0.82)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '16px'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: '#0d111a',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: '30px 28px',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          <X size={15} />
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#ffffff',
            color: '#080a0f',
            marginBottom: '14px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)'
          }}>
            <Zap size={20} strokeWidth={2.5} fill="#080a0f" />
          </div>

          <h2 style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.025em',
            lineHeight: 1.2
          }}>
            {tab === 'login' && 'Sign in to GhostQueue'}
            {tab === 'register' && 'Create your account'}
            {tab === 'guest' && 'Quick Guest Ticket'}
          </h2>

          <p style={{
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
            marginTop: '6px'
          }}>
            {tab === 'login' && 'Enter your organization credentials or test profile'}
            {tab === 'register' && 'Register to manage queue tokens and appointments'}
            {tab === 'guest' && 'Take a place in line instantly without an account'}
          </p>
        </div>

        {/* Segmented Tab Control */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2px',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '3px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid var(--border-subtle)'
        }}>
          {[
            { id: 'login', label: 'Sign In' },
            { id: 'register', label: 'Register' },
            { id: 'guest', label: 'Guest Pass' }
          ].map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setError(''); }}
                style={{
                  background: isActive ? '#1e2538' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
                  padding: '7px 4px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#f87171',
            fontSize: '0.82rem',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontWeight: 600 }}>Error:</span>
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Full Name for Register or Guest */}
          {(tab === 'register' || tab === 'guest') && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px', fontSize: '0.86rem' }}
                />
              </div>
            </div>
          )}

          {/* Email for Login or Register */}
          {(tab === 'login' || tab === 'register') && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  required
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px', fontSize: '0.86rem' }}
                />
              </div>
            </div>
          )}

          {/* Password for Login or Register */}
          {(tab === 'login' || tab === 'register') && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Password
                </label>
                {tab === 'login' && (
                  <span
                    onClick={() => alert('For this demo, default password is "admin123", "operator123", or "visitor123".')}
                    style={{ fontSize: '0.74rem', color: '#60a5fa', cursor: 'pointer' }}
                  >
                    Forgot password?
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px', paddingRight: '38px', fontSize: '0.86rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Phone Number for Guest or Register */}
          {(tab === 'guest' || tab === 'register') && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Mobile Number {tab === 'guest' ? '(Optional for SMS alert)' : '(Optional)'}
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px', fontSize: '0.86rem' }}
                />
              </div>
            </div>
          )}

          {/* Remember Me checkbox on Login */}
          {tab === 'login' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <label htmlFor="remember" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Keep me signed in on this device
              </label>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '11px',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginTop: '4px'
            }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>
                  {tab === 'login' && 'Sign In to Workspace'}
                  {tab === 'register' && 'Create Account'}
                  {tab === 'guest' && 'Enter Digital Queue'}
                </span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Clean Demo Profiles Section */}
        <div style={{ marginTop: '22px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{
            fontSize: '0.72rem',
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontWeight: 600
          }}>
            One-Click Evaluation Accounts
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                padding: '8px 6px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
            >
              <Shield size={14} color="#60a5fa" />
              <span>Admin</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>Full access</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('operator')}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                padding: '8px 6px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
            >
              <Tv size={14} color="#34d399" />
              <span>Operator</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>Desk window</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('visitor')}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                padding: '8px 6px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
            >
              <Ticket size={14} color="#f59e0b" />
              <span>Visitor</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>Queue pass</span>
            </button>
          </div>
        </div>

        {/* Security / Encryption Micro-Copy */}
        <div style={{
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '0.72rem',
          color: 'var(--text-tertiary)'
        }}>
          <ShieldCheck size={13} color="var(--status-success)" />
          <span>Encrypted JWT Sessions • PostgreSQL Concurrency Safe</span>
        </div>
      </div>
    </div>
  );
}
