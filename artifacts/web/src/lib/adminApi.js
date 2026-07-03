/**
 * Authenticated client for the SBEP admin API.
 * Routes to the API server via the shared proxy at `/api` and attaches the
 * JWT from localStorage as a Bearer token.
 */

const TOKEN_KEY = 'sbep_auth_token';
const BASE = '/api';

function authHeaders(extra = {}) {
  let token = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(path, options = {}) {
  const resp = await fetch(BASE + path, {
    ...options,
    headers: authHeaders(options.headers),
  });

  if (!resp.ok) {
    let msg = `Request failed (${resp.status})`;
    try {
      const body = await resp.json();
      msg = body.error || body.message || msg;
    } catch {
      /* ignore */
    }
    const err = new Error(msg);
    err.status = resp.status;
    throw err;
  }

  if (resp.status === 204) return null;
  return resp.json();
}

function toQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const adminApi = {
  getDashboard: () => request('/admin/dashboard'),
  getAnalytics: () => request('/admin/analytics'),
  getHealth: () => request('/admin/health'),
  getUsageByUser: (limit = 50) => request(`/admin/usage/by-user${toQuery({ limit })}`),
  getRevenueActivity: (params = {}) => request(`/admin/revenue${toQuery(params)}`),
  getBusinessOpsAnalytics: (params = {}) => request(`/admin/business-ops-analytics${toQuery(params)}`),
  getAiAnalytics: (params = {}) => request(`/admin/ai-analytics${toQuery(params)}`),
  testOpenRouter: () => request('/admin/openrouter/test', { method: 'POST' }),
  getEmailStatus: () => request('/admin/email-status'),
  testEmailDelivery: () => request('/admin/email-status/test', { method: 'POST' }),
  listUsers: (params = {}) => request(`/admin/platform-users${toQuery(params)}`),
  getUserDetail: (id) => request(`/admin/platform-users/${id}`),
  updateUser: (id, body) =>
    request(`/admin/platform-users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adjustCredits: (id, body) =>
    request(`/admin/platform-users/${id}/credits`, { method: 'POST', body: JSON.stringify(body) }),
  sendResetEmail: (id) =>
    request(`/admin/platform-users/${id}/send-reset`, { method: 'POST' }),
  getStripeOverview: () => request('/admin/stripe/overview'),
  getStripeStatus: () => request('/admin/stripe/status'),
  getUnprovisionedSessions: () => request('/admin/stripe/unprovisioned-sessions'),
  provisionUser: (body) =>
    request('/admin/stripe/provision-user', { method: 'POST', body: JSON.stringify(body) }),
  rotateKey: (newKeyHex) =>
    request('/admin/credentials/rotate-key', { method: 'POST', body: JSON.stringify({ newKeyHex }) }),
  getPlatformConfig: () => request('/admin/platform-config'),
  updatePlatformConfig: (body) =>
    request('/admin/platform-config', { method: 'PATCH', body: JSON.stringify(body) }),
};

export default adminApi;
