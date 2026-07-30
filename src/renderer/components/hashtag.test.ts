import { describe, expect, test } from 'bun:test';
import { getHashtagName } from './hashtag.ts';

describe('getHashtagName', () => {
  test('removes the leading hash mark from a hashtag link label', () => {
    expect(getHashtagName('#cats')).toBe('cats');
  });

  test('preserves non-ASCII hashtag names', () => {
    expect(getHashtagName('#猫')).toBe('猫');
  });

  test('returns null when the link label has no tag name', () => {
    expect(getHashtagName('#')).toBeNull();
  });
});
