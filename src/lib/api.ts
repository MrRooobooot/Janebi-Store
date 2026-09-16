let refreshing: Promise<boolean> | null = null;

// Rotate the session cookies through the HttpOnly refresh cookie. Single-flight:
// concurrent 401s share one request.
async function refreshSession(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// One-shot 401 recovery. The access cookie lives 1d, the refresh cookie 7d, so
// long-lived tabs/PWA sessions hit 401 after expiry. The refresh call rotates
// both cookies, which means a plain retry suffices — no credential is ever
// handed back to JavaScript (the localStorage JWT mirror was removed: it was a
// script-readable 1-day token sitting next to the HttpOnly cookie it duplicated).
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status !== 401) return res;
  const refreshed = await refreshSession();
  if (!refreshed) return res;
  return fetch(url, init);
}