import { describe, expect, test } from 'bun:test';
import { getHashtagName, getHashtagNameFromLink } from './hashtag.ts';

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

  test('returns null when the link label is not a hashtag', () => {
    expect(getHashtagName('cats')).toBeNull();
  });
});

describe('getHashtagNameFromLink', () => {
  test('recognizes a Mastodon hashtag class', () => {
    expect(
      getHashtagNameFromLink('#cats', 'https://mastodon.example/tags/cats', 'mention hashtag'),
    ).toBe('cats');
  });

  test('recognizes a tag URL without a hashtag class', () => {
    expect(getHashtagNameFromLink('#cats', 'https://misskey.example/tags/cats', '')).toBe('cats');
  });

  test('does not treat a non-tag URL as a hashtag', () => {
    expect(getHashtagNameFromLink('#cats', 'https://example.com/posts/1', '')).toBeNull();
  });
});
