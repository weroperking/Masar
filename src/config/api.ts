export const API_BASE_URL = 'https://masar-api.weroperking.workers.dev';

export function syncHeaders(token?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Sync-Encrypted': 'true',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

  // Ensure X-Sync-Encrypted is consistently present on sync endpoints
  if (url.startsWith('/api/sync') && !headers.has('X-Sync-Encrypted')) {
    headers.set('X-Sync-Encrypted', 'true');
  }

  console.log('[SYNC REQUEST]', url, options.method || 'GET', JSON.stringify([...headers.entries()]));

  // TEMP DIAGNOSTIC — remove after debugging
  try {
    const hdrs: Record<string, string> = {};
    new Headers(options.headers || {}).forEach((v, k) => { hdrs[k.toLowerCase()] = v; });
    const auth = hdrs['authorization'] || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    let claims: any = null;
    if (token.split('.').length === 3) {
      try {
        const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        claims = JSON.parse(atob(payload));
      } catch { /* ignore */ }
    }
    (window as any).__SYNC_DIAG__ = {
      timestamp: new Date().toISOString(),
      url,
      method: options.method || 'GET',
      headerNames: Object.keys(hdrs),
      hasAuthorization: !!auth,
      tokenLength: token.length,
      tokenPrefix: token.slice(0, 20),
      tokenLooksLikeJWT: token.split('.').length === 3,
      claims: claims ? {
        iss: claims.iss,
        sub: claims.sub,
        exp: claims.exp,
        expReadable: claims.exp ? new Date(claims.exp * 1000).toISOString() : null,
        nowReadable: new Date().toISOString(),
        azp: claims.azp,
        isExpired: claims.exp ? (claims.exp * 1000 < Date.now()) : null,
      } : null,
    };
    console.log('[SYNC DIAG]', (window as any).__SYNC_DIAG__);
  } catch (e) {
    console.warn('[SYNC DIAG] failed to capture', e);
  }

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
