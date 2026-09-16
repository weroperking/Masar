export const API_BASE_URL = 'https://masar-api.weroperking.workers.dev';

export async function fetchWithAuth(url: string, token: string | null, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

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
