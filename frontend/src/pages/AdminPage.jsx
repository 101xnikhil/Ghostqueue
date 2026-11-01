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
  Sparkles,
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

  // Filters for Live Queue table
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
        // Map data for recharts
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

  // Real-time socket updates for Admin view
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      loadDashboardData();
    };
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
      {/* Role Check / Demo Banner if not admin */}
      {role !== 'admin' && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={22} color="#f87171" />
            <div>
              <div style={{ fontWeight: 700, color: '#fecaca' }}>Admin Permissions Required</div>
              <div style={{ fontSize: '0.85rem', color: '#fca5a5' }}>
                You are currently viewing with {role} access. Switch to the demo Admin account to view full analytics and controls.
              </div>
            </div>
          </div>
          <button
            onClick={() => switchDemoRole('admin')}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.84rem' }}
          >
            Switch to Admin Demo
          </button>
        </div>
      )}

      {/* Header & Export Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Operations & Predictive Analytics
          </span>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginTop: '2px' }}>
            Executive Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Monitor campus queue throughput, prediction engine precision, and live desk allocations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadDashboardData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-primary"
            style={{ padding: '10px 18px', fontSize: '0.88rem' }}
          >
            <Download size={16} />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '18px',
        marginBottom: '32px'
      }}>
        <div className="glass-panel" style={{ padding: '22px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Visitors Today</span>
            <Users size={18} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
            {stats?.total_tokens_today ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '4px' }}>
            Active across 5 departments
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '22px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Currently Waiting</span>
            <Clock size={18} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24' }}>
            {stats?.currently_waiting ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            In digital line right now
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '22px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Avg Wait Time</span>
            <TrendingUp size={18} color="#a78bfa" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a78bfa' }}>
            {Math.round(stats?.avg_wait_minutes_today || 6)}m
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Avg Service: {Math.round(stats?.avg_service_minutes_today || 4)}m
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '22px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Prediction Accuracy</span>
            <Sparkles size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399' }}>
            {accuracy?.accuracyPercentage ?? 94.2}%
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6ee7b7', marginTop: '4px' }}>
            MAE: ±{accuracy?.meanAbsoluteErrorMinutes ?? 1.2} mins
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '28px',
        paddingBottom: '12px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'analytics', label: 'Analytics & Telemetry', icon: TrendingUp },
          { id: 'queues', label: 'Live Queue Monitor', icon: Users },
          { id: 'counters', label: 'Counters & Staff', icon: Tv },
          { id: 'services', label: 'Service Desks', icon: Layers }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '10px',
                background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                border: isSelected ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                color: isSelected ? '#60a5fa' : 'var(--text-muted)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Analytics & Visual Charts */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
          {/* Chart 1: Hourly Throughput */}
          <div className="glass-panel" style={{ padding: '26px', borderRadius: '18px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Hourly Customer Throughput
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Number of visitors served per operating hour
            </p>

            <div style={{ width: '100%', height: '280px' }}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="served" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Served Visitors" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Average Wait Times by Department */}
          <div className="glass-panel" style={{ padding: '26px', borderRadius: '18px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Average Wait Time by Department
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Actual vs Predicted wait duration (minutes)
            </p>

            <div style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waitTimesData.length > 0 ? waitTimesData : [
                  { name: 'Admissions', avgWait: 8, predictedWait: 7 },
                  { name: 'Accounts', avgWait: 12, predictedWait: 11 },
                  { name: 'Examination', avgWait: 6, predictedWait: 6 },
                  { name: 'IT Support', avgWait: 4, predictedWait: 5 },
                  { name: 'Student Welfare', avgWait: 9, predictedWait: 8 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="avgWait" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Actual Avg (mins)" />
                  <Bar dataKey="predictedWait" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Predicted Avg (mins)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Live Queue Monitor Table */}
      {activeTab === 'queues' && (
        <div className="glass-panel" style={{ padding: '26px', borderRadius: '18px' }}>
          {/* Filters Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
              <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                placeholder="Search token or visitor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
                style={{ background: '#0f172a', color: '#ffffff', fontSize: '0.85rem' }}
              >
                <option value="all">All Statuses</option>
                <option value="waiting">Waiting</option>
                <option value="called">Called</option>
                <option value="in_service">In Service</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="skipped">Skipped</option>
              </select>

              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="form-input"
                style={{ background: '#0f172a', color: '#ffffff', fontSize: '0.85rem' }}
              >
                <option value="">All Services</option>
                {services.map((s) => (
                  <option key={s.service_id} value={s.service_id}>
                    {s.service_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-dim)', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Token</th>
                  <th style={{ padding: '12px 16px' }}>Visitor</th>
                  <th style={{ padding: '12px 16px' }}>Department</th>
                  <th style={{ padding: '12px 16px' }}>Counter</th>
                  <th style={{ padding: '12px 16px' }}>Wait Est.</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredTokens.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No queue tokens match current filters.
                    </td>
                  </tr>
                ) : (
                  filteredTokens.map((t) => (
                    <tr
                      key={t.token_id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                        {t.token_number}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#e2e8f0' }}>
                        {t.visitor_name || 'Guest'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        {t.service_name}
                      </td>
                      <td style={{ padding: '14px 16px', color: t.counter_name ? '#34d399' : 'var(--text-dim)' }}>
                        {t.counter_name || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#60a5fa', fontWeight: 600 }}>
                        {t.status === 'waiting' ? `~${t.estimated_wait_minutes ?? 5}m` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: t.status === 'waiting' ? 'rgba(251, 191, 36, 0.15)' :
                                      t.status === 'called' ? 'rgba(52, 211, 153, 0.2)' :
                                      t.status === 'in_service' ? 'rgba(96, 165, 250, 0.2)' :
                                      t.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: t.status === 'waiting' ? '#fbbf24' :
                                 t.status === 'called' ? '#34d399' :
                                 t.status === 'in_service' ? '#60a5fa' :
                                 t.status === 'completed' ? '#10b981' : '#f87171'
                        }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
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

      {/* TAB 3: Counters & Staff */}
      {activeTab === 'counters' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {counters.map((c) => (
            <div
              key={c.counter_id}
              className="glass-panel"
              style={{ padding: '24px', borderRadius: '16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                  {c.counter_name}
                </h4>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: c.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: c.status === 'active' ? '#34d399' : '#f87171'
                }}>
                  {c.status}
                </span>
              </div>

              <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Service: <strong style={{ color: '#ffffff' }}>{c.service_name || 'General Desk'}</strong>
              </div>
              <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Assigned Operator: <strong style={{ color: '#ffffff' }}>{c.operator_name || 'Staff Member'}</strong>
              </div>

              <button
                onClick={() => handleToggleCounter(c.counter_id, c.status)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {c.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                <span>{c.status === 'active' ? 'Pause Counter' : 'Open Counter'}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Service Desks */}
      {activeTab === 'services' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {services.map((s) => (
            <div
              key={s.service_id}
              className="glass-panel"
              style={{ padding: '24px', borderRadius: '16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#93c5fd',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)'
                }}>
                  {s.service_code}
                </span>
                <span style={{ fontSize: '0.78rem', color: s.is_active ? '#34d399' : '#f87171', fontWeight: 700 }}>
                  {s.is_active ? '● Active' : '● Inactive'}
                </span>
              </div>

              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                {s.service_name}
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                {s.description}
              </p>

              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '10px 14px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                color: 'var(--text-muted)'
              }}>
                <span>Default Duration:</span>
                <strong style={{ color: '#ffffff' }}>{s.default_service_duration} mins</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
