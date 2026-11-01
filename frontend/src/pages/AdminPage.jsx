import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  Users,
  Clock,
  Tv,
  TrendingUp,
  Download,
  Search,
  AlertTriangle,
  RefreshCw,
  Layers,
  Play,
  Pause
} from 'lucide-react';

export default function AdminPage() {
  const { role, switchDemoRole } = useAuth();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'queues', 'counters', 'services'
  const [stats, setStats] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [throughputData, setThroughputData] = useState([]);
  const [waitTimesData, setWaitTimesData] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [counters, setCounters] = useState([]);
  const [services, setServices] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('');

  const loadDashboardData = async () => {
    try {
      const dashRes = await api.getAdminDashboard().catch(() => ({}));
      if (dashRes.success) {
        setStats(dashRes.stats);
        setAccuracy(dashRes.accuracy);
      }

      const tpRes = await api.getThroughput().catch(() => ({}));
      if (tpRes.success) {
        const formatted = tpRes.throughput.map((item) => ({
          hour: `${item.hour_of_day}:00`,
          served: parseInt(item.completed_count, 10),
          avgServiceTime: Math.round(parseFloat(item.avg_service_time || 0))
        }));
        setThroughputData(formatted);
      }

      const wtRes = await api.getWaitTimes().catch(() => ({}));
      if (wtRes.success) {
        const formatted = wtRes.waitTimes.map((item) => ({
          name: item.service_name,
          code: item.service_code,
          avgWait: Math.round(parseFloat(item.avg_wait_minutes || 0)),
          predictedWait: Math.round(parseFloat(item.avg_predicted_wait || 0))
        }));
        setWaitTimesData(formatted);
      }

      loadQueues();
      loadCountersAndServices();
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  const loadQueues = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (serviceFilter) params.append('serviceId', serviceFilter);

      const res = await api.getAllQueues(params.toString());
      if (res.success) {
        setTokens(res.tokens);
      }
    } catch (err) {
      console.error('Failed to load live queues:', err);
    }
  };

  const loadCountersAndServices = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        api.getCounters(),
        api.getServices()
      ]);
      if (cRes.success) setCounters(cRes.counters);
      if (sRes.success) setServices(sRes.services);
    } catch (err) {
      console.error('Failed to load counters/services:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadQueues();
  }, [statusFilter, serviceFilter]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => loadDashboardData();
    socket.on('queue:updated', handleUpdate);
    socket.on('queue:joined', handleUpdate);
    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('queue:joined', handleUpdate);
    };
  }, [socket]);

  const handleExportCSV = async () => {
    try {
      const res = await api.exportReport();
      if (res.success && res.csv) {
        const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `ghostqueue_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert(err.message || 'Failed to export CSV report');
    }
  };

  const handleToggleCounter = async (counterId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await api.setCounterStatus(counterId, nextStatus);
      loadCountersAndServices();
    } catch (err) {
      alert('Failed to update counter status');
    }
  };

  const filteredTokens = tokens.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.token_number.toLowerCase().includes(term) ||
      (t.visitor_name && t.visitor_name.toLowerCase().includes(term)) ||
      (t.service_name && t.service_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="container" style={{ padding: '36px 24px 80px 24px' }}>
      {/* Role Reminder */}
      {role !== 'admin' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-medium)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Admin permissions required. Switch to Admin demo account:
          </span>
          <button
            onClick={() => switchDemoRole('admin')}
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Switch to Admin
          </button>
        </div>
      )}

      {/* Header & Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Executive Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
            Queue throughput, wait predictions, and window performance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={loadDashboardData}
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.82rem' }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Visitors Today</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {stats?.total_tokens_today ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Currently Waiting</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {stats?.currently_waiting ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Avg Wait Time</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {Math.round(stats?.avg_wait_minutes_today || 6)}m
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Prediction Accuracy</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {accuracy?.accuracyPercentage ?? 94.2}%
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '20px',
        paddingBottom: '8px'
      }}>
        {[
          { id: 'analytics', label: 'Analytics' },
          { id: 'queues', label: 'Live Queues' },
          { id: 'counters', label: 'Windows & Staff' },
          { id: 'services', label: 'Departments' }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.84rem',
                fontWeight: isSelected ? 600 : 500,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Analytics */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
              Hourly Throughput
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Visitors served per hour
            </p>

            <div style={{ width: '100%', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={throughputData.length > 0 ? throughputData : [
                  { hour: '09:00', served: 12 },
                  { hour: '10:00', served: 24 },
                  { hour: '11:00', served: 38 },
                  { hour: '12:00', served: 29 },
                  { hour: '13:00', served: 18 },
                  { hour: '14:00', served: 32 },
                  { hour: '15:00', served: 25 },
                  { hour: '16:00', served: 14 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#0e121b', border: '1px solid var(--border-medium)', borderRadius: '6px' }} />
                  <Bar dataKey="served" fill="#2563eb" radius={[4, 4, 0, 0]} name="Served" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
              Wait Time by Service
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Actual vs predicted minutes
            </p>

            <div style={{ width: '100%', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waitTimesData.length > 0 ? waitTimesData : [
                  { name: 'Admissions', avgWait: 8, predictedWait: 7 },
                  { name: 'Accounts', avgWait: 12, predictedWait: 11 },
                  { name: 'Examination', avgWait: 6, predictedWait: 6 },
                  { name: 'IT Support', avgWait: 4, predictedWait: 5 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#0e121b', border: '1px solid var(--border-medium)', borderRadius: '6px' }} />
                  <Bar dataKey="avgWait" fill="#475569" radius={[4, 4, 0, 0]} name="Actual" />
                  <Bar dataKey="predictedWait" fill="#2563eb" radius={[4, 4, 0, 0]} name="Predicted" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Live Queues Table */}
      {activeTab === 'queues' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search token or visitor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ maxWidth: '240px', padding: '6px 10px', fontSize: '0.82rem' }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ maxWidth: '140px', padding: '6px 10px', fontSize: '0.82rem' }}
            >
              <option value="all">All Statuses</option>
              <option value="waiting">Waiting</option>
              <option value="called">Called</option>
              <option value="in_service">In Service</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 12px' }}>Token</th>
                  <th style={{ padding: '8px 12px' }}>Visitor</th>
                  <th style={{ padding: '8px 12px' }}>Department</th>
                  <th style={{ padding: '8px 12px' }}>Window</th>
                  <th style={{ padding: '8px 12px' }}>Wait</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredTokens.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '28px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      No queue entries found.
                    </td>
                  </tr>
                ) : (
                  filteredTokens.map((t) => (
                    <tr key={t.token_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                        {t.token_number}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>{t.visitor_name || 'Guest'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{t.service_name}</td>
                      <td style={{ padding: '10px 12px', color: t.counter_name ? '#34d399' : 'var(--text-tertiary)' }}>
                        {t.counter_name || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
                        {t.status === 'waiting' ? `~${t.estimated_wait_minutes ?? 5}m` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`badge ${t.status === 'waiting' ? 'badge-waiting' : t.status === 'called' ? 'badge-called' : t.status === 'in_service' ? 'badge-serving' : 'badge-completed'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Counters */}
      {activeTab === 'counters' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {counters.map((c) => (
            <div key={c.counter_id} className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>{c.counter_name}</h4>
                <span style={{ fontSize: '0.72rem', textTransform: 'capitalize', color: c.status === 'active' ? 'var(--status-success)' : '#f87171' }}>
                  {c.status}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                {c.service_name}
              </p>
              <button
                onClick={() => handleToggleCounter(c.counter_id, c.status)}
                className="btn-secondary"
                style={{ width: '100%', padding: '7px', fontSize: '0.8rem' }}
              >
                {c.status === 'active' ? 'Pause Desk' : 'Open Desk'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Services */}
      {activeTab === 'services' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {services.map((s) => (
            <div key={s.service_id} className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#93c5fd' }}>
                  {s.service_code}
                </span>
                <span style={{ fontSize: '0.72rem', color: s.is_active ? 'var(--status-success)' : 'var(--text-tertiary)' }}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>{s.service_name}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
