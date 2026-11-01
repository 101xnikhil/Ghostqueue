import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import JoinModal from './components/JoinModal';
import ToastContainer from './components/ToastContainer';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import TrackingPage from './pages/TrackingPage';
import OperatorPage from './pages/OperatorPage';
import AdminPage from './pages/AdminPage';
import DisplayPage from './pages/DisplayPage';
import { Radio } from 'lucide-react';

function GhostQueueApp() {
  const [activePage, setActivePage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) return 'tracking';
    return params.get('page') || 'home';
  });

  const [activeTokenId, setActiveTokenId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || null;
  });

  const [authModalOpen, setAuthModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('page') === 'login' || params.get('page') === 'auth';
  });
  const [authModalTab, setAuthModalTab] = useState('login');
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [preselectedService, setPreselectedService] = useState(null);

  // Synchronize URL parameters without reloading
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activePage === 'tracking' && activeTokenId) {
      params.set('token', activeTokenId);
    } else {
      params.delete('token');
    }
    if (activePage !== 'home') {
      params.set('page', activePage);
    } else {
      params.delete('page');
    }
    const newQuery = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, '', newQuery);
  }, [activePage, activeTokenId]);

  const handleOpenJoinModal = (service = null) => {
    setPreselectedService(service);
    setJoinModalOpen(true);
  };

  const handleOpenAuthModal = (tab = 'guest') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleTokenJoined = (token) => {
    setActiveTokenId(token.token_id);
    setActivePage('tracking');
  };

  // If in Display Board mode, render full-screen monitor view without standard navbar
  if (activePage === 'display') {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: '#040711' }}>
        {/* Quick exit to dashboard button in corner */}
        <button
          onClick={() => setActivePage('home')}
          style={{
            position: 'fixed',
            top: '16px',
            right: '80px',
            zIndex: 9999,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Exit TV Board
        </button>
        <DisplayPage />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        openAuthModal={handleOpenAuthModal}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {activePage === 'home' && (
          <HomePage
            setActivePage={setActivePage}
            openJoinModal={handleOpenJoinModal}
          />
        )}

        {activePage === 'services' && (
          <ServicesPage
            openJoinModal={handleOpenJoinModal}
          />
        )}

        {activePage === 'tracking' && (
          <TrackingPage
            activeTokenId={activeTokenId}
            setActiveTokenId={setActiveTokenId}
            openJoinModal={handleOpenJoinModal}
          />
        )}

        {activePage === 'operator' && (
          <OperatorPage />
        )}

        {activePage === 'admin' && (
          <AdminPage />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        background: '#080a0f',
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px',
        color: 'var(--text-tertiary)',
        fontSize: '0.8rem'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: '#ffffff' }}>GhostQueue</span>
            <span>·</span>
            <span>Real-time queue & desk telemetry</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setActivePage('display')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Radio size={13} />
              <span>TV Wallboard Mode</span>
            </button>
            <span>v2.0</span>
          </div>
        </div>
      </footer>

      {/* Modals & Live Toasts */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
      />

      <JoinModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        preselectedService={preselectedService}
        onTokenJoined={handleTokenJoined}
      />

      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <GhostQueueApp />
      </SocketProvider>
    </AuthProvider>
  );
}
