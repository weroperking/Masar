export const API_BASE_URL = 'https://masar-api.weroperking.workers.dev';

export function syncHeaders(token?: string | null, publicKeyHash?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Sync-Encrypted': 'true',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (publicKeyHash) {
    const payload = JSON.stringify({ publicKeyHash });
    headers['X-Sync-Auth'] = btoa(unescape(encodeURIComponent(payload)));
  }
  return headers;
}

export async function fetchWithAuth(url: string, token: string | null, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (url.startsWith('/api/sync') && !headers.has('X-Sync-Encrypted')) {
    headers.set('X-Sync-Encrypted', 'true');
  }

  console.log('[SYNC REQUEST]', url, options.method || 'GET', JSON.stringify([...headers.entries()]));

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  console.log('[SYNC RESPONSE]', response.status, response.headers.get('content-type'));

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export const API_ENDPOINTS = {
  subscription: {
    status: (orgId?: string) => `/api/me/subscription-status${orgId ? `?orgId=${orgId}` : ''}`,
  },
  proposals: {
    status: (orgId: string) => `/api/orgs/${orgId}/upgrade-proposal/status`,
    submit: (orgId: string) => `/api/orgs/${orgId}/upgrade-proposal`,
  },
  // We can add specific routes here if needed, but generic REST follows /api/:resource
};
