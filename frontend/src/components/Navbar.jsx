import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { 
  Zap, 
  Layers, 
  Clock, 
  Tv, 
  SlidersHorizontal, 
  User, 
  LogOut, 
  Bell, 
  ChevronDown,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage, openAuthModal }) {
  const { user, isAuthenticated, logout, switchDemoRole } = useAuth();
  const { isConnected } = useSocket();
  const [activeToken, setActiveToken] = useState(null);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch active token and notifications
  useEffect(() => {
    async function loadUserData() {
      if (isAuthenticated) {
        try {
          const tokRes = await api.getMyTokens();
          if (tokRes.success) {
            const active = tokRes.tokens.find(t => ['waiting', 'called', 'in_service'].includes(t.status));
            setActiveToken(active || null);
          }

          const notifRes = await api.getNotifications();
          if (notifRes.success) {
            setNotifications(notifRes.notifications);
            setUnreadCount(notifRes.notifications.filter(n => !n.is_read).length);
          }
        } catch (e) {
          // ignore
        }
      } else {
        setActiveToken(null);
        setNotifications([]);
        setUnreadCount(0);
      }
    }

    loadUserData();
    const interval = setInterval(loadUserData, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activePage]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'rgba(7, 11, 20, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px'
      }}>
        {/* Brand */}
        <div 
          onClick={() => setActivePage('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--grad-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.45)'
          }}>
            <Zap size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff' }}>
                GHOST<span style={{ color: 'var(--accent-blue)' }}>QUEUE</span>
              </span>
              <span style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                v2.0
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Smart Queue Predictor
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setActivePage('home')}
            style={{
              background: activePage === 'home' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activePage === 'home' ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Home
          </button>

          <button
            onClick={() => setActivePage('services')}
            style={{
              background: activePage === 'services' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activePage === 'services' ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={16} />
            Services
          </button>

          <button
            onClick={() => setActivePage('tracking')}
            style={{
              background: activePage === 'tracking' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activePage === 'tracking' ? '#60a5fa' : 'var(--text-muted)',
              border: activePage === 'tracking' ? '1px solid rgba(59, 130, 246, 0.3)' : 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={16} />
            Live Tracking
            {activeToken && (
              <span style={{
                background: '#10b981',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '10px',
                animation: 'pulse-border 2s infinite'
              }}>
                {activeToken.token_number}
              </span>
            )}
          </button>

          <button
            onClick={() => setActivePage('operator')}
            style={{
              background: activePage === 'operator' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activePage === 'operator' ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Tv size={16} />
            Operator Screen
          </button>

          <button
            onClick={() => setActivePage('admin')}
            style={{
              background: activePage === 'admin' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activePage === 'admin' ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <SlidersHorizontal size={16} />
            Admin Dashboard
          </button>

          <button
            onClick={() => setActivePage('display')}
            style={{
              background: activePage === 'display' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activePage === 'display' ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Tv size={16} />
            TV Board
          </button>
        </nav>

        {/* Right Section: Role Switcher & User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Real-time Status Dot */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: isConnected ? '#34d399' : '#f87171',
            padding: '4px 10px',
            borderRadius: '12px',
            background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: isConnected ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#ef4444',
              boxShadow: isConnected ? '0 0 8px #10b981' : 'none'
            }} />
            {isConnected ? 'Real-Time Sync' : 'Reconnecting...'}
          </div>

          {/* Quick Demo Role Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              style={{
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                color: '#c4b5fd',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={14} />
              Role: <span style={{ textTransform: 'capitalize', color: '#ffffff' }}>{user ? user.role : 'Guest'}</span>
              <ChevronDown size={14} />
            </button>

            {showRoleMenu && (
              <div style={{
                position: 'absolute',
                top: '115%',
                right: 0,
                width: '210px',
                background: 'rgba(15, 23, 42, 0.98)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '8px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                zIndex: 1001
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', padding: '4px 8px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Quick Role Switcher
                </div>
                <button
                  onClick={() => { switchDemoRole('admin'); setShowRoleMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    textAlign: 'left',
                    background: user?.role === 'admin' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>👑 Administrator</span>
                  {user?.role === 'admin' && <CheckCircle2 size={14} color="#a78bfa" />}
                </button>
                <button
                  onClick={() => { switchDemoRole('operator'); setShowRoleMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    textAlign: 'left',
                    background: user?.role === 'operator' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>💼 Counter Operator</span>
                  {user?.role === 'operator' && <CheckCircle2 size={14} color="#60a5fa" />}
                </button>
                <button
                  onClick={() => { switchDemoRole('visitor'); setShowRoleMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    textAlign: 'left',
                    background: user?.role === 'visitor' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>🎟️ Visitor / Student</span>
                  {user?.role === 'visitor' && <CheckCircle2 size={14} color="#34d399" />}
                </button>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          {isAuthenticated && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div style={{
                  position: 'absolute',
                  top: '115%',
                  right: 0,
                  width: '320px',
                  background: 'rgba(15, 23, 42, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                  zIndex: 1001
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', padding: '16px 0' }}>No notifications yet</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.notification_id} style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                          marginBottom: '6px',
                          fontSize: '0.8rem',
                          color: n.is_read ? 'var(--text-muted)' : '#ffffff'
                        }}>
                          {n.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile or Sign In */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  {user.is_guest ? 'Guest Visitor' : user.email || user.role}
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <User size={15} />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
