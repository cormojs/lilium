import { expect, test } from 'bun:test';
import { RateLimiter } from './rateLimiter.ts';

test('limits concurrent requests and starts queued work when a request finishes', async () => {
  const limiter = new RateLimiter({
    maxConcurrentRequests: 1,
    maxBurstRequests: 3,
    requestsPerSecond: 1,
  });
  const started: number[] = [];
  let finishFirst: (() => void) | undefined;

  const first = limiter.run(
    () =>
      new Promise<void>((resolve) => {
        started.push(1);
        finishFirst = resolve;
      }),
  );
  const second = limiter.run(async () => {
    started.push(2);
  });

  await Promise.resolve();
  expect(started).toEqual([1]);

  finishFirst?.();
  await Promise.all([first, second]);
  expect(started).toEqual([1, 2]);
});

test('waits for a new token before starting further queued requests', async () => {
  const limiter = new RateLimiter({
    maxConcurrentRequests: 2,
    maxBurstRequests: 1,
    requestsPerSecond: 100,
  });
  const started: number[] = [];

  const first = limiter.run(async () => {
    started.push(1);
  });
  const second = limiter.run(async () => {
    started.push(2);
  });

  await first;
  expect(started).toEqual([1]);
  await second;
  expect(started).toEqual([1, 2]);
});
