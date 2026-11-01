const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('ghostqueue_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw {
      status: response.status,
      message: data.message || `Request failed with status ${response.status}`,
      ...data
    };
  }

  return data;
}

export const api = {
  // Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  guestLogin: (payload) => request('/auth/guest', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),

  // Services
  getServices: () => request('/services'),
  createService: (payload) => request('/services', { method: 'POST', body: JSON.stringify(payload) }),
  updateService: (id, payload) => request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteService: (id) => request(`/services/${id}`, { method: 'DELETE' }),

  // Counters
  getCounters: () => request('/counters'),
  createCounter: (payload) => request('/counters', { method: 'POST', body: JSON.stringify(payload) }),
  updateCounter: (id, payload) => request(`/counters/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCounter: (id) => request(`/counters/${id}`, { method: 'DELETE' }),

  // Queue
  joinQueue: (payload) => request('/queue/join', { method: 'POST', body: JSON.stringify(payload) }),
  getMyTokens: () => request('/queue/my-token'),
  getToken: (tokenId) => request(`/queue/${tokenId}`),
  cancelToken: (tokenId, reason) => request(`/queue/${tokenId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getServiceQueue: (serviceId) => request(`/queue/service/${serviceId}`),

  // Operator
  callNext: (counterId) => request('/operator/call-next', { method: 'POST', body: JSON.stringify({ counterId }) }),
  startService: (tokenId, counterId) => request('/operator/start-service', { method: 'POST', body: JSON.stringify({ tokenId, counterId }) }),
  completeService: (tokenId, counterId, notes) => request('/operator/complete-service', { method: 'POST', body: JSON.stringify({ tokenId, counterId, notes }) }),
  skipToken: (tokenId, counterId, reason) => request('/operator/skip-token', { method: 'POST', body: JSON.stringify({ tokenId, counterId, reason }) }),
  setCounterStatus: (counterId, status) => request('/operator/counter-status', { method: 'PUT', body: JSON.stringify({ counterId, status }) }),
  getCounterState: (counterId) => request(`/operator/counter/${counterId}/state`),

  // Admin
  getAdminDashboard: () => request('/admin/dashboard'),
  getAllQueues: (params = '') => request(`/admin/queues${params ? '?' + params : ''}`),
  getOperators: () => request('/admin/operators'),
  getVisitors: () => request('/admin/visitors'),
  getSettings: () => request('/admin/settings'),
  updateSettings: (payload) => request('/admin/settings', { method: 'PUT', body: JSON.stringify(payload) }),

  // Analytics
  getWaitTimes: () => request('/analytics/wait-times'),
  getThroughput: () => request('/analytics/throughput'),
  getPeakHours: () => request('/analytics/peak-hours'),
  getPredictionAccuracy: () => request('/analytics/prediction-accuracy'),
  exportReport: () => request('/analytics/export'),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' })
};
