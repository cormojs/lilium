import { createRestAPIClient } from 'masto';
import type { mastodon } from 'masto';

const DEFAULT_CAPACITY = 300;
const DEFAULT_REFILL_RATE = 1; // tokens per second (300 / 5min)

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private waitQueue: (() => void)[] = [];

  constructor(
    private readonly capacity: number = DEFAULT_CAPACITY,
    private readonly refillRate: number = DEFAULT_REFILL_RATE,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = ((1 - this.tokens) / this.refillRate) * 1000;
    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
      setTimeout(() => {
        this.refill();
        this.tokens -= 1;
        const idx = this.waitQueue.indexOf(resolve);
        if (idx !== -1) {
          this.waitQueue.splice(idx, 1);
        }
        resolve();
      }, waitMs);
    });
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

const clientCache = new Map<string, mastodon.rest.Client>();
const buckets = new Map<string, TokenBucket>();

function clientKey(serverUrl: string, accessToken: string): string {
  return `${serverUrl}::${accessToken}`;
}

/**
 * Get a cached REST API client for the given server and access token.
 */
export function getRestClient(serverUrl: string, accessToken: string): mastodon.rest.Client {
  const key = clientKey(serverUrl, accessToken);
  let client = clientCache.get(key);
  if (!client) {
    client = createRestAPIClient({ url: serverUrl, accessToken });
    clientCache.set(key, client);
  }
  return client;
}

/**
 * Remove cached clients for a specific server/token pair.
 */
export function removeRestClient(serverUrl: string, accessToken: string): void {
  clientCache.delete(clientKey(serverUrl, accessToken));
}

function getBucket(serverUrl: string): TokenBucket {
  let bucket = buckets.get(serverUrl);
  if (!bucket) {
    bucket = new TokenBucket();
    buckets.set(serverUrl, bucket);
  }
  return bucket;
}

/**
 * Execute an API call with rate limiting per server.
 */
export async function withRateLimit<T>(serverUrl: string, fn: () => PromiseLike<T>): Promise<T> {
  const bucket = getBucket(serverUrl);
  await bucket.acquire();
  return fn();
}
