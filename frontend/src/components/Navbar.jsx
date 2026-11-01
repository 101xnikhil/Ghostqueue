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
  Check
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage, openAuthModal }) {
  const { user, isAuthenticated, logout, switchDemoRole } = useAuth();
  const { isConnected } = useSocket();
  const [activeToken, setActiveToken] = useState(null);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'tracking', label: 'Tracker', icon: Clock, badge: activeToken?.token_number },
    { id: 'operator', label: 'Operator', icon: Tv },
    { id: 'admin', label: 'Admin', icon: SlidersHorizontal },
    { id: 'display', label: 'TV Board', icon: Tv }
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: '#080a0f',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px'
      }}>
        {/* Brand */}
        <div 
          onClick={() => setActivePage('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#080a0f'
          }}>
            <Zap size={16} strokeWidth={2.5} fill="#080a0f" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              GhostQueue
            </span>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isConnected ? 'var(--status-success)' : 'var(--status-danger)',
              display: 'inline-block'
            }} title={isConnected ? 'Realtime Connected' : 'Reconnecting'} />
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)'
        }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                style={{
                  background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                {Icon && <Icon size={14} style={{ opacity: isSelected ? 1 : 0.7 }} />}
                <span>{item.label}</span>
                {item.badge && (
                  <span style={{
                    background: 'var(--status-success)',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '4px'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Role Switcher & User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Quick Demo Role Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <span>Role: <strong style={{ color: '#ffffff', textTransform: 'capitalize' }}>{user ? user.role : 'Guest'}</strong></span>
              <ChevronDown size={12} />
            </button>

            {showRoleMenu && (
              <div style={{
                position: 'absolute',
                top: '120%',
                right: 0,
                width: '180px',
                background: '#0e121b',
                border: '1px solid var(--border-medium)',
                borderRadius: '8px',
                padding: '4px',
                boxShadow: '0 10px 24px rgba(0,0,0,0.5)',
                zIndex: 1001
              }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', padding: '4px 8px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Switch Demo Role
                </div>
                {[
                  { id: 'admin', label: 'Admin' },
                  { id: 'operator', label: 'Operator' },
                  { id: 'visitor', label: 'Visitor' }
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { switchDemoRole(r.id); setShowRoleMenu(false); }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      textAlign: 'left',
                      background: user?.role === r.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      color: user?.role === r.id ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: user?.role === r.id ? 600 : 400,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{r.label}</span>
                    {user?.role === r.id && <Check size={14} color="#3b82f6" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          {isAuthenticated && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    width: '15px',
                    height: '15px',
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
                  top: '120%',
                  right: 0,
                  width: '280px',
                  background: '#0e121b',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  padding: '8px',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
                  zIndex: 1001
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '0.72rem', cursor: 'pointer' }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>No notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.notification_id} style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          background: n.is_read ? 'transparent' : 'rgba(37, 99, 235, 0.08)',
                          marginBottom: '4px',
                          fontSize: '0.78rem',
                          color: n.is_read ? 'var(--text-secondary)' : '#ffffff'
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
              <span style={{ fontSize: '0.82rem', color: '#ffffff', fontWeight: 500, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
              <button
                onClick={logout}
                title="Sign Out"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <User size={14} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
