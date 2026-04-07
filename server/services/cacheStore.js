/** Simple in-memory LRU-style cache with TTL and max size. */

export class CacheStore {
  constructor({ maxSize = 200, ttlMs = 3600_000 } = {}) {
    this.store = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  _evict() {
    if (this.store.size < this.maxSize) return;
    const firstKey = this.store.keys().next().value;
    this.store.delete(firstKey);
  }

  set(key, value, ttlMs) {
    const expires = Date.now() + (ttlMs ?? this.ttlMs);
    this._evict();
    this.store.delete(key);
    this.store.set(key, { value, expires });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    this.store.delete(key);
  }

  get size() {
    return this.store.size;
  }
}

export const investigationCache = new CacheStore({ maxSize: 300, ttlMs: 6 * 3600_000 });
export const barcodeCache = new CacheStore({ maxSize: 500, ttlMs: 24 * 3600_000 });
export const cityNarrativeCache = new CacheStore({ maxSize: 200, ttlMs: 24 * 3600_000 });
