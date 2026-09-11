// jsonFetch — single internal fetch convention: JSON in/out, safe error extraction.
// authFetch (same file) stays the only authed path. GETs here are auto-no-store
// (json cache-busting) so callers can't accidentally read stale SW cache.
// Exemptions (keep raw fetch): ProductDetail (AbortController + JSON-LD),
// AuthContext/Login/ForcedPasswordChange (auth state machine), useProductFilters
// list fetch (reads X-Total-Count response headers).
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error || `خطای سرور (${res.status})`;
}

export async function jsonFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return data as T;
}

export async function getJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return (await res.json()) as T;
}
