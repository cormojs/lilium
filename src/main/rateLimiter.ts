/**
 * Rate limiter for Mastodon API calls.
 * Combines a semaphore (max concurrency) with a token bucket (max rate).
 */

const MAX_CONCURRENT = 4;
const TOKENS_PER_SECOND = 2;
const MAX_TOKENS = 300;

let tokens = MAX_TOKENS;
let lastRefill = Date.now();
let activeCalls = 0;
const waitQueue: Array<() => void> = [];

function refillTokens(): void {
  const now = Date.now();
  const elapsed = (now - lastRefill) / 1000;
  tokens = Math.min(MAX_TOKENS, tokens + elapsed * TOKENS_PER_SECOND);
  lastRefill = now;
}

function tryAcquire(): boolean {
  refillTokens();
  if (activeCalls < MAX_CONCURRENT && tokens >= 1) {
    activeCalls++;
    tokens -= 1;
    return true;
  }
  return false;
}

function release(): void {
  activeCalls--;
  processQueue();
}

function processQueue(): void {
  while (waitQueue.length > 0 && tryAcquire()) {
    const resolve = waitQueue.shift()!;
    resolve();
  }
}

function acquire(): Promise<void> {
  if (tryAcquire()) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    waitQueue.push(resolve);
    // Schedule a retry for when tokens should refill
    const waitMs = tokens < 1 ? ((1 - tokens) / TOKENS_PER_SECOND) * 1000 : 100;
    setTimeout(() => processQueue(), Math.ceil(waitMs));
  });
}

export async function rateLimitedCall<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}
