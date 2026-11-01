import React from 'react';
import { useSocket } from '../context/SocketContext';
import { Bell, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useSocket();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '340px',
      width: '100%'
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: '#0e121b',
            border: toast.type === 'called' ? '1px solid var(--status-success)' : '1px solid var(--border-medium)',
            borderRadius: '8px',
            padding: '12px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          {toast.type === 'called' ? (
            <Bell size={16} color="var(--status-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
          ) : toast.type === 'success' ? (
            <CheckCircle2 size={16} color="var(--status-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
          ) : (
            <AlertTriangle size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
          )}

          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.84rem', fontWeight: 600, margin: '0 0 2px 0' }}>{toast.title}</h4>
            <p style={{ fontSize: '0.78rem', margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{toast.message}</p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '2px'
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
