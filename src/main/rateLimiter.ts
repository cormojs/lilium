/**
 * Rate limiting for Mastodon REST API calls.
 *
 * Limiters are isolated per server: activity on one instance must not delay
 * requests to another, while tabs and accounts on the same instance share a
 * conservative request budget.
 */

const MAX_CONCURRENT_REQUESTS = 2;
const MAX_BURST_REQUESTS = 3;
const REQUESTS_PER_SECOND = 1;

interface QueueEntry {
  resolve: () => void;
}

export interface RateLimiterOptions {
  maxConcurrentRequests: number;
  maxBurstRequests: number;
  requestsPerSecond: number;
}

export class RateLimiter {
  private tokens: number;
  private lastRefill = Date.now();
  private activeRequests = 0;
  private readonly queue: QueueEntry[] = [];
  private retryTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly options: RateLimiterOptions) {
    this.tokens = options.maxBurstRequests;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.queue.push({ resolve });
      this.processQueue();
    });
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1_000;
    this.tokens = Math.min(
      this.options.maxBurstRequests,
      this.tokens + elapsedSeconds * this.options.requestsPerSecond,
    );
    this.lastRefill = now;
  }

  private processQueue(): void {
    this.refillTokens();

    while (
      this.queue.length > 0 &&
      this.activeRequests < this.options.maxConcurrentRequests &&
      this.tokens >= 1
    ) {
      const entry = this.queue.shift();
      if (!entry) break;

      this.tokens--;
      this.activeRequests++;
      entry.resolve();
    }

    this.scheduleRetry();
  }

  private scheduleRetry(): void {
    if (
      this.retryTimer ||
      this.queue.length === 0 ||
      this.activeRequests >= this.options.maxConcurrentRequests ||
      this.tokens >= 1
    ) {
      return;
    }

    const waitMs = Math.ceil(((1 - this.tokens) / this.options.requestsPerSecond) * 1_000);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      this.processQueue();
    }, waitMs);
  }
}

const limiters = new Map<string, RateLimiter>();

function getRateLimiter(serverUrl: string): RateLimiter {
  let limiter = limiters.get(serverUrl);
  if (!limiter) {
    limiter = new RateLimiter({
      maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
      maxBurstRequests: MAX_BURST_REQUESTS,
      requestsPerSecond: REQUESTS_PER_SECOND,
    });
    limiters.set(serverUrl, limiter);
  }
  return limiter;
}

/** Execute a REST API call within the budget for its Mastodon server. */
export function rateLimitedCall<T>(serverUrl: string, fn: () => Promise<T>): Promise<T> {
  return getRateLimiter(serverUrl).run(fn);
}
