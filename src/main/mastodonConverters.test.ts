import { describe, expect, test } from 'bun:test';
import type { mastodon } from 'masto';
import { convertStatus } from './mastodonConverters.ts';

function createStatus(overrides: Partial<mastodon.v1.Status> = {}): mastodon.v1.Status {
  return {
    id: 'status-1',
    content: '<p>本文</p>',
    createdAt: '2026-06-18T00:00:00.000Z',
    spoilerText: '',
    sensitive: false,
    url: 'https://example.com/@alice/1',
    visibility: 'public',
    account: {
      id: 'account-1',
      acct: 'alice',
      displayName: 'Alice',
      avatar: 'https://example.com/avatar.png',
      emojis: [],
    },
    mediaAttachments: [],
    emojis: [],
    favourited: false,
    reblogged: false,
    bookmarked: false,
    ...overrides,
  } as unknown as mastodon.v1.Status;
}

describe('convertStatus', () => {
  test('does not treat quote-inline content as a quote when status.quote is empty', () => {
    const content =
      '<p>本文</p><p class="quote-inline">RE: <a href="https://example.com/@bob/2">https://example.com/@bob/2</a></p>';

    const post = convertStatus(createStatus({ content, quote: null }));

    expect(post.content).toBe(content);
    expect(post.quote).toBeUndefined();
  });

  test('keeps recognizing a trailing Misskey note link as a fallback quote', () => {
    const content =
      '<p>本文<br><a href="https://misskey.example/notes/abc123">https://misskey.example/notes/abc123</a></p>';

    const post = convertStatus(createStatus({ content, quote: null }));

    expect(post.quote).toEqual({
      state: 'accepted',
      quotedUrl: 'https://misskey.example/notes/abc123',
    });
  });
});
