import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const audioContextRef = useRef(null);

  // Synthesize a pleasant notification chime using Web Audio API
  const playChime = () => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx && ctx.state !== 'suspended') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      // Audio playback allowed upon user gesture
    }
  };

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    // Connect socket
    const socketInstance = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('📡 Socket connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for global user notifications
    socketInstance.on('queue:token_called', (data) => {
      playChime();
      addToast({
        title: '🔔 Your Turn!',
        message: `Token ${data.tokenNumber}: Please proceed immediately to ${data.counterName}!`,
        type: 'called'
      });
    });

    socketInstance.on('queue:position_changed', (data) => {
      if (data.peopleAhead <= 2 && data.peopleAhead > 0) {
        playChime();
        addToast({
          title: '⚡ Your Turn is Approaching',
          message: `Only ${data.peopleAhead} person(s) ahead of you. Estimated wait: ~${data.estimatedWaitMinutes} mins.`,
          type: 'approaching'
        });
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  const value = {
    socket,
    isConnected,
    toasts,
    addToast,
    removeToast,
    playChime,
    joinTokenRoom: (tokenId) => socket?.emit('join:token', tokenId),
    leaveTokenRoom: (tokenId) => socket?.emit('leave:token', tokenId),
    joinServiceRoom: (serviceId) => socket?.emit('join:service', serviceId),
    leaveServiceRoom: (serviceId) => socket?.emit('leave:service', serviceId),
    joinCounterRoom: (counterId) => socket?.emit('join:counter', counterId)
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
