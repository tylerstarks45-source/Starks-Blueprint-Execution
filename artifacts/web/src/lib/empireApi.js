import { getApiHeaders } from '@/lib/apiHeaders.js';

async function call(method, url, body) {
  const res = await fetch(url, { method, headers: getApiHeaders(), body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
  return s ? `?${s}` : '';
};

export const empireApi = {
  overview: () => call('GET', '/api/empire/overview'),
  search: (q) => call('GET', `/api/empire/search${qs({ q })}`),
  types: () => call('GET', '/api/empire/business-types'),
  createType: (body) => call('POST', '/api/empire/business-types', body),
  deleteType: (key) => call('DELETE', `/api/empire/business-types/${encodeURIComponent(key)}`),
  createBusiness: (body) => call('POST', '/api/empire/businesses', body),
  setBusinessType: (id, typeKey) => call('PATCH', `/api/empire/businesses/${id}/type`, { typeKey }),
  streams: (businessId) => call('GET', `/api/empire/streams${qs({ businessId })}`),
  createStream: (body) => call('POST', '/api/empire/streams', body),
  updateStream: (id, body) => call('PATCH', `/api/empire/streams/${id}`, body),
  deleteStream: (id) => call('DELETE', `/api/empire/streams/${id}`),
  assets: (params = {}) => call('GET', `/api/empire/assets${qs(params)}`),
  createAsset: (body) => call('POST', '/api/empire/assets', body),
  updateAsset: (id, body) => call('PATCH', `/api/empire/assets/${id}`, body),
  shareAsset: (id, businessId) => call('POST', `/api/empire/assets/${id}/shares`, { businessId }),
  unshareAsset: (id, businessId) => call('DELETE', `/api/empire/assets/${id}/shares/${businessId}`),
};

export const controlApi = {
  get: () => call('GET', '/api/ash-control'),
  saveAccount: (body) => call('PUT', '/api/ash-control', body),
  saveBusiness: (id, body) => call('PUT', `/api/ash-control/businesses/${id}`, body),
  clearBusiness: (id) => call('DELETE', `/api/ash-control/businesses/${id}`),
  missions: () => call('GET', '/api/missions'),
  createMission: (body) => call('POST', '/api/missions', body),
  missionAction: (id, action, note) => call('POST', `/api/missions/${id}/${action}`, note ? { note } : {}),
  approvals: (status = 'pending') => call('GET', `/api/approvals${qs({ status })}`),
  resolveApproval: (id, action) => call('POST', `/api/approvals/${id}/${action}`),
};

export const LEVELS = [
  { key: 'advisor', name: 'Advisor', blurb: 'ASH suggests. Every change she wants to make waits in your Approvals inbox.' },
  { key: 'copilot', name: 'Co-pilot', blurb: 'ASH builds inside your account (businesses, streams, assets). In the background she asks before anything goes live.' },
  { key: 'operator', name: 'Operator', blurb: 'ASH runs things on her own within your rules. Spending always needs your OK.' },
  { key: 'autopilot', name: 'Autopilot', blurb: 'ASH runs everything, and may spend within your daily and monthly limits.' },
];

export const ACTION_KIND_LABELS = {
  build: 'Building in my account', publish: 'Publishing or going live', email_customers: 'Emailing customers',
  spend: 'Spending money', delete: 'Deleting things', connect_service: 'Using connected services', legal: 'Legal / identity steps',
};

export const usd = (n) => (n == null ? '—' : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
export const centsUsd = (c) => (c == null ? '—' : `$${(Number(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
export const label = (s) => String(s ?? '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
