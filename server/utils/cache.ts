type CacheEntry<T> = {
  data: T;
  headers?: Record<string, string>;
  expiresAt: number;
};

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  get<T>(key: string): { data: T; headers?: Record<string, string> } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return { data: entry.data, headers: entry.headers };
  }

  set<T>(key: string, data: T, ttlSeconds: number = 60, headers?: Record<string, string>): void {
    this.store.set(key, {
      data,
      headers,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  invalidate(pattern?: string | RegExp): void {
    if (!pattern) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (typeof pattern === "string" ? key.includes(pattern) : pattern.test(key)) {
        this.store.delete(key);
      }
    }
  }
}

export const appCache = new MemoryCache();
