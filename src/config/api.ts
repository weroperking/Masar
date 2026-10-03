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

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function fetchWithAuth(url: string, token: string | null, options: RequestInit = {}) {
  const isSyncRoute = url.startsWith('/api/sync/') || url.startsWith('/api/sync');
  const targetUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (isSyncRoute && !headers.has('X-Sync-Encrypted')) {
    headers.set('X-Sync-Encrypted', 'true');
  }

  console.log('[SYNC REQUEST]', url, options.method || 'GET', JSON.stringify([...headers.entries()]));

  // FORCE Cloudflare Worker for sync and PIN routes
  if (isSyncRoute || url.startsWith('/api/pin-configs')) {
    const upstreamCtrl = new AbortController();
    const upstreamTimeout = setTimeout(() => upstreamCtrl.abort(), 15000);
    const upstreamRes = await withTimeout(
      fetch(targetUrl, {
        ...options,
        headers,
        signal: options.signal || upstreamCtrl.signal,
      }),
      20_000,
      'sync fetch'
    );
    clearTimeout(upstreamTimeout);

    console.log('[SYNC RESPONSE upstream]', upstreamRes.status, upstreamRes.headers.get('content-type'));

    if (!upstreamRes.ok) {
      const errorText = await upstreamRes.text();
      throw new Error(`Upstream API Error: ${upstreamRes.status} - ${errorText}`);
    }

    return await upstreamRes.json();
  }

  // First attempt the local/current application backend (for other non-sync routes)
  try {
    const localCtrl = new AbortController();
    const localTimeout = setTimeout(() => localCtrl.abort(), 6000);
    const localRes = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || localCtrl.signal,
    });
    clearTimeout(localTimeout);
    if (localRes.ok) {
      console.log('[RESPONSE local]', localRes.status, localRes.headers.get('content-type'));
      return await localRes.json();
    }
  } catch (localErr) {
    console.warn('[REQUEST local failed, trying upstream]', localErr);
  }

  const upstreamCtrl = new AbortController();
  const upstreamTimeout = setTimeout(() => upstreamCtrl.abort(), 10000);
  const response = await withTimeout(
    fetch(targetUrl, {
      ...options,
      headers,
      signal: options.signal || upstreamCtrl.signal,
    }),
    20_000,
    'upstream fetch'
  );
  clearTimeout(upstreamTimeout);

  console.log('[SYNC RESPONSE upstream]', response.status, response.headers.get('content-type'));

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
  // We can add specific routes here if needed, but generic REST follows /api/:resource
};
