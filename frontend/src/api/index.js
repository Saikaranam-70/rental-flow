import api from './axios';

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
};

// ── Dashboard ─────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/rentals/dashboard'),
};

// ── Customers ─────────────────────────────────────────────────────
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  toggleBlacklist: (id, data) => api.post(`/customers/${id}/blacklist`, data),
  uploadId: (id, formData) => api.post(`/customers/${id}/upload-id`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }),
  getStats: () => api.get('/customers/stats'),
};

// ── Inventory ─────────────────────────────────────────────────────
export const inventoryAPI = {
  getAll: (params) => api.get('/inventory', { params }),
  getOne: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
  uploadPhoto: (id, formData) => api.post(`/inventory/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }),
  addMaintenance: (id, data) => api.post(`/inventory/${id}/maintenance`, data),
  getStats: () => api.get('/inventory/stats'),
};

// ── Rentals ───────────────────────────────────────────────────────
export const rentalsAPI = {
  getAll: (params) => api.get('/rentals', { params }),
  getOne: (id) => api.get(`/rentals/${id}`),
  create: (data) => api.post('/rentals', data),
  addPayment: (id, data) => api.post(`/rentals/${id}/payment`, data),
  processReturn: (id, data) => api.post(`/rentals/${id}/return`, data),
  extend: (id, data) => api.post(`/rentals/${id}/extend`, data),
  cancel: (id) => api.delete(`/rentals/${id}`),
  getDashboard: () => api.get('/rentals/dashboard'),
};

// ── Payments ──────────────────────────────────────────────────────
export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
};

// ── Reports ───────────────────────────────────────────────────────
export const reportsAPI = {
  getOverview: (params) => api.get('/reports/overview', { params }),
  exportRentals: (params) => api.get('/reports/export/rentals', { params, responseType: 'blob' }),
  exportCustomers: () => api.get('/reports/export/customers', { responseType: 'blob' }),
};

// ── Agency ────────────────────────────────────────────────────────
export const agencyAPI = {
  getProfile: () => api.get('/agency/profile'),
  updateProfile: (data) => api.put('/agency/profile', data),
  uploadLogo: (formData) => api.post('/agency/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  testSalesReport: () => api.post('/agency/test-sales-report'),
};

// ── Staff ─────────────────────────────────────────────────────────
export const staffAPI = {
  getAll: () => api.get('/staff'),
  invite: (data) => api.post('/staff/invite', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  remove: (id) => api.delete(`/staff/${id}`),
};

// ── Alerts ────────────────────────────────────────────────────────
export const alertsAPI = {
  getAll: () => api.get('/alerts'),
  sendOverdue: (rentalId) => api.post('/alerts/send-overdue', { rentalId }),
};

// ── Helpers ───────────────────────────────────────────────────────
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
