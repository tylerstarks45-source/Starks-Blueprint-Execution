/**
 * Returns Authorization + Content-Type headers, and automatically includes
 * X-Client-Workspace-Id when the user has an active client workspace.
 *
 * Usage: fetch('/api/system-instances', { headers: getApiHeaders() })
 */
export const getApiHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  const stored = localStorage.getItem('sbep_active_client_workspace');
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (stored) {
    try {
      const ws = JSON.parse(stored);
      if (ws?.id) headers['X-Client-Workspace-Id'] = String(ws.id);
    } catch {}
  }
  return headers;
};

/**
 * Same as getApiHeaders but without Content-Type — use for GET/DELETE requests
 * where you don't want to set Content-Type.
 */
export const getAuthHeaders = () => {
  const h = getApiHeaders();
  const { 'Content-Type': _omit, ...rest } = h;
  return rest;
};
