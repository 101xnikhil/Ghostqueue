import React from 'react';
import { useSocket } from '../context/SocketContext';
import { Bell, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useSocket();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      width: '100%'
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: toast.type === 'called' 
              ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(139, 92, 246, 0.95))'
              : 'rgba(15, 23, 42, 0.95)',
            border: toast.type === 'called' ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            animation: 'slide-in 0.3s ease-out'
          }}
        >
          {toast.type === 'called' ? (
            <Bell size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px', animation: 'float 1s infinite' }} />
          ) : toast.type === 'success' ? (
            <CheckCircle2 size={20} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
          ) : (
            <AlertTriangle size={20} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
          )}

          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 2px 0' }}>{toast.title}</h4>
            <p style={{ fontSize: '0.82rem', margin: 0, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>{toast.message}</p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              padding: '2px'
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
