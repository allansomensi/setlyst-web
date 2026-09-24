/**
 * A small in-memory token bucket per key (a user id): `capacity` requests
 * at once, refilled continuously at `capacity` per `windowMs`. Per server
 * instance, which is enough for its purpose: taking the fun out of looping
 * an expensive endpoint, not exact accounting.
 *
 * The map is capped: past `maxKeys` the least recently used buckets are
 * dropped (a dropped bucket simply starts full again).
 *
 * Pure (no Next.js imports) so it is unit tested.
 */
export class TokenBucketLimiter {
  private readonly buckets = new Map<
    string,
    { tokens: number; updatedAt: number }
  >();

  constructor(
    private readonly capacity: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  /**
   * Takes one token for `key`. Returns 0 when the request may proceed,
   * otherwise the seconds until a token is available.
   */
  take(key: string, now: number = Date.now()): number {
    const refillPerMs = this.capacity / this.windowMs;
    const bucket = this.buckets.get(key);
    let tokens = this.capacity;
    if (bucket) {
      const elapsed = Math.max(0, now - bucket.updatedAt);
      tokens = Math.min(this.capacity, bucket.tokens + elapsed * refillPerMs);
      // Re-inserted below, so the map stays in least-recently-used order.
      this.buckets.delete(key);
    }

    if (tokens < 1) {
      this.buckets.set(key, { tokens, updatedAt: now });
      return Math.max(1, Math.ceil((1 - tokens) / refillPerMs / 1000));
    }

    this.buckets.set(key, { tokens: tokens - 1, updatedAt: now });
    while (this.buckets.size > this.maxKeys) {
      const oldest = this.buckets.keys().next().value;
      if (oldest === undefined) break;
      this.buckets.delete(oldest);
    }
    return 0;
  }
}
