interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Tiny in-process TTL cache.
 *
 * Search results are cached to protect the YouTube Data API daily quota
 * (a single search.list call costs 100 units). This cache lives per server
 * instance; a multi-instance deployment would swap in Redis later.
 */
export class TtlCache<V> {
  private entries = new Map<string, CacheEntry<V>>();
  private ttlMs: number;
  private maxEntries: number;

  constructor(ttlMs: number, maxEntries = 500) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
