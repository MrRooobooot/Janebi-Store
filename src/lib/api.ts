let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      if (data.accessToken) {
        localStorage.setItem('token', data.accessToken);
        return data.accessToken as string;
      }
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// One-shot 401 recovery for Bearer-authed requests: the access token lives 1d,
// the HttpOnly refresh cookie 7d — long-lived tabs/PWA sessions hit 401 after
// expiry. Retries once through /api/auth/refresh; passes through otherwise.
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const res = await fetch(url, { ...init, headers });
  if (res.status !== 401 || !headers.has('Authorization')) return res;
  const fresh = await refreshAccessToken();
  if (!fresh) return res;
  headers.set('Authorization', `Bearer ${fresh}`);
  return fetch(url, { ...init, headers });
}
