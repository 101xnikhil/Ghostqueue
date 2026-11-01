import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ghostqueue_token') || null);
  const [loading, setLoading] = useState(true);

  // Load current user profile if token is present
  useEffect(() => {
    async function initUser() {
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success) {
            setUser(res.user);
          } else {
            logout();
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
          logout();
        }
      }
      setLoading(false);
    }
    initUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    if (res.success) {
      localStorage.setItem('ghostqueue_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (payload) => {
    const res = await api.register(payload);
    if (res.success) {
      localStorage.setItem('ghostqueue_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const guestLogin = async (name, phone) => {
    const res = await api.guestLogin({ name, phone });
    if (res.success) {
      localStorage.setItem('ghostqueue_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('ghostqueue_token');
    setToken(null);
    setUser(null);
  };

  // Demo role switcher helper
  const switchDemoRole = async (targetRole) => {
    if (targetRole === 'admin') {
      return login('admin@ghostqueue.io', 'admin123');
    } else if (targetRole === 'operator') {
      return login('operator1@ghostqueue.io', 'operator123');
    } else if (targetRole === 'visitor') {
      return login('visitor@ghostqueue.io', 'visitor123');
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.success) {
        setUser(res.user);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  const value = {
    user,
    token,
    role: user?.role || 'visitor',
    isAuthenticated: !!user,
    loading,
    login,
    register,
    guestLogin,
    logout,
    switchDemoRole,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
