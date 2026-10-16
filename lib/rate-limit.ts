export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Minimal fixed-window rate limiter backed by an in-memory Map.
 *
 * Good enough for a single-instance deployment and for shielding the music
 * provider from bursts. Replace with a Redis-backed limiter when Sphere runs
 * on more than one instance.
 */
export class FixedWindowRateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    this.prune(now);

    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.limit - 1, retryAfterSeconds: 0 };
    }

    if (entry.count >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      };
    }

    entry.count += 1;
    return { allowed: true, remaining: this.limit - entry.count, retryAfterSeconds: 0 };
  }

  private prune(now: number): void {
    if (this.hits.size < 2000) return;
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
  }
}
