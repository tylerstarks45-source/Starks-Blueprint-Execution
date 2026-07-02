/**
 * SBEP PocketBase Shim
 * Provides a PocketBase-compatible API surface that routes to the SBEP REST API.
 * Replaces the pocketbase npm package entirely — no external SDK needed.
 */

const TOKEN_KEY = 'sbep_auth_token';
const USER_KEY = 'sbep_auth_user';

// ---------------------------------------------------------------------------
// AuthStore
// ---------------------------------------------------------------------------
class AuthStore {
  constructor() {
    this._listeners = [];
    this._token = null;
    this._model = null;

    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);
      if (savedToken && savedUser) {
        this._token = savedToken;
        this._model = JSON.parse(savedUser);
      }
    } catch {
      // ignore
    }
  }

  get token() { return this._token; }
  get model() { return this._model; }
  get isValid() { return !!this._token && !!this._model; }

  save(token, model) {
    this._token = token;
    this._model = model;
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(model));
    } catch { /* ignore */ }
    this._notify(token, model);
  }

  clear() {
    this._token = null;
    this._model = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* ignore */ }
    this._notify(null, null);
  }

  onChange(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== callback);
    };
  }

  _notify(token, model) {
    this._listeners.forEach((cb) => { try { cb(token, model); } catch { /* ignore */ } });
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
async function apiRequest(path, options = {}) {
  const token = (() => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } })();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const resp = await fetch(path, { ...options, headers });

  if (!resp.ok) {
    let errMsg = resp.statusText;
    try { const body = await resp.json(); errMsg = body.error || body.message || errMsg; } catch { /* ignore */ }
    const err = new Error(errMsg);
    err.status = resp.status;
    throw err;
  }

  if (resp.status === 204) return null;
  return resp.json();
}

function parseFilter(filter) {
  if (!filter) return {};
  const params = {};
  const m = (re) => { const r = filter.match(re); return r ? r[1] : null; };
  const slug = m(/slug\s*=\s*["']([^"']+)["']/);           if (slug)      params.slug = slug;
  const userId = m(/user(?:Id)?\s*=\s*["']([^"']+)["']/);  if (userId)    params.userId = userId;
  const bpId = m(/blueprint(?:Id)?\s*=\s*["']([^"']+)["']/); if (bpId)    params.blueprintId = bpId;
  const cat = m(/category\s*=\s*["']([^"']+)["']/);         if (cat)      params.category = cat;
  const status = m(/status\s*=\s*["']([^"']+)["']/);        if (status)   params.status = status;
  const id = m(/\bid\s*=\s*["']([^"']+)["']/);              if (id)       params.id = id;
  const activeOnly = m(/activeOnly\s*=\s*["']?(true|false)["']?/); if (activeOnly) params.activeOnly = activeOnly;
  return params;
}

function toListResult(items, page, perPage) {
  const list = Array.isArray(items) ? items : [];
  return { page: page || 1, perPage: perPage || list.length || 30, totalItems: list.length, totalPages: 1, items: list };
}

// ---------------------------------------------------------------------------
// Collection routing map
// ---------------------------------------------------------------------------
const ENDPOINT_MAP = {
  users:                '/api/users',
  blueprints:           '/api/blueprints',
  blueprint_categories: '/api/blueprint-categories',
  tools:                '/api/tools',
  tool_categories:      '/api/tool-categories',
  saved_systems:        '/api/system-instances',
  system_instances:     '/api/system-instances',
  affiliate_links:      '/api/affiliate-links',
  contact_submissions:  '/api/contact',
  updates:              '/api/notifications',
  notifications:        '/api/notifications',
  user_credentials:     '/api/user-credentials',
  build_sessions:       '/api/build-sessions',
  saved_tools:          '/api/user-tool-selections',
  user_tool_selections: '/api/user-tool-selections',
  build_progress:       '/api/build-progress',
  build_outputs:        '/api/build-outputs',
  user_memory:          '/api/user-memory',
};

// ---------------------------------------------------------------------------
// Collection class
// ---------------------------------------------------------------------------
class SBEPCollection {
  constructor(name, endpoint) {
    this._name = name;
    this._endpoint = endpoint;
  }

  async authWithPassword(email, password, _opts = {}) {
    // Always clear any pre-existing session BEFORE attempting a new login.
    // This guarantees a stale token/user object from a previous account on
    // this device (e.g. a shared device, or an old test session) can never
    // bleed into the new session — the only way `authStore.model` can be
    // populated after this call is from a fresh, server-verified response
    // for the credentials just submitted.
    pocketbaseClient.authStore.clear();
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    pocketbaseClient.authStore.save(data.token, data.user);
    return { token: data.token, record: data.user };
  }

  async create(data, _opts = {}) {
    if (this._name === 'users') {
      const payload = { email: data.email, password: data.password, name: data.name || '' };
      if (data.referralCode) payload.referralCode = data.referralCode;
      const result = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return result.user;
    }
    return apiRequest(this._endpoint, { method: 'POST', body: JSON.stringify(data) });
  }

  async authWithOAuth2(_opts = {}) {
    throw Object.assign(new Error('Google login is not yet available. Please use email and password.'), { status: 400 });
  }

  async requestPasswordReset(email, _opts = {}) {
    try { await apiRequest('/api/auth/request-reset', { method: 'POST', body: JSON.stringify({ email }) }); } catch { /* swallow */ }
    return true;
  }

  async requestVerification(_email, _opts = {}) { return true; }

  async getList(page = 1, perPage = 30, options = {}) {
    const filterParams = parseFilter(options.filter);
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage), ...(options.sort ? { sort: options.sort } : {}), ...filterParams });
    const result = await apiRequest(`${this._endpoint}?${params}`);
    if (result && typeof result === 'object' && Array.isArray(result.items)) return result;
    return toListResult(result, page, perPage);
  }

  async getOne(id, _opts = {}) {
    return apiRequest(`${this._endpoint}/${id}`);
  }

  async getFirstListItem(filter, _opts = {}) {
    const filterParams = parseFilter(filter);
    const params = new URLSearchParams({ perPage: '1', ...filterParams });
    const result = await apiRequest(`${this._endpoint}?${params}`);
    const items = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : [];
    if (items.length === 0) { const err = new Error("The requested resource wasn't found."); err.status = 404; throw err; }
    return items[0];
  }

  async update(id, data, _opts = {}) {
    return apiRequest(`${this._endpoint}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async delete(id, _opts = {}) {
    await apiRequest(`${this._endpoint}/${id}`, { method: 'DELETE' });
    return true;
  }

  async getFullList(options = {}) {
    const filterParams = parseFilter(options.filter);
    const params = new URLSearchParams({ perPage: '200', ...(options.sort ? { sort: options.sort } : {}), ...filterParams });
    const result = await apiRequest(`${this._endpoint}?${params}`);
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.items)) return result.items;
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main shim
// ---------------------------------------------------------------------------
class PocketBaseShim {
  constructor() {
    this.authStore = new AuthStore();
    this._collections = {};
  }

  collection(name) {
    if (!this._collections[name]) {
      const endpoint = ENDPOINT_MAP[name] || `/api/${name.replace(/_/g, '-')}`;
      this._collections[name] = new SBEPCollection(name, endpoint);
    }
    return this._collections[name];
  }
}

const pocketbaseClient = new PocketBaseShim();

export default pocketbaseClient;
export { pocketbaseClient };
