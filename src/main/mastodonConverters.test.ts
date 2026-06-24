import { describe, expect, test } from 'bun:test';
import log from 'electron-log/main';
import type { mastodon } from 'masto';
import { convertStatus } from './mastodonConverters.ts';

log.transports.file.level = false;

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
  test('appends quote-inline content from the quoted status URL when it is missing', () => {
    const quotedStatus = createStatus({
      id: 'status-2',
      url: 'https://example.com/@bob/2?foo=1&bar=2',
    });
    const status = createStatus({
      quote: {
        state: 'accepted',
        quotedStatus,
      },
    });

    const post = convertStatus(status);

    expect(post.content).toBe(
      '<p>本文</p><p class="quote-inline">RE: <a href="https://example.com/@bob/2?foo=1&amp;bar=2">https://example.com/@bob/2?foo=1&amp;bar=2</a></p>',
    );
    expect(post.quote?.quotedUrl).toBe('https://example.com/@bob/2?foo=1&bar=2');
    expect(post.quote?.quotedInlineContent).toBe(
      'RE: <a href="https://example.com/@bob/2?foo=1&amp;bar=2">https://example.com/@bob/2?foo=1&amp;bar=2</a>',
    );
  });

  test('does not append duplicate quote-inline content', () => {
    const content =
      '<p>本文</p><p class="quote-inline">RE: <a href="https://example.com/@bob/2">https://example.com/@bob/2</a></p>';
    const status = createStatus({
      content,
      quote: {
        state: 'accepted',
        quotedStatus: createStatus({
          id: 'status-2',
          url: 'https://example.com/@bob/2',
        }),
      },
    });

    expect(convertStatus(status).content).toBe(content);
  });

  test('extracts quote-inline content from a span element', () => {
    const content =
      '<p>本文</p><span class="status-link quote-inline">RE: <a href="https://example.com/@bob/2">https://example.com/@bob/2</a></span>';
    const status = createStatus({
      content,
      quote: {
        state: 'accepted',
        quotedStatus: createStatus({
          id: 'status-2',
          url: 'https://example.com/@bob/2',
        }),
      },
    });

    const post = convertStatus(status);

    expect(post.content).toBe(content);
    expect(post.quote?.quotedUrl).toBe('https://example.com/@bob/2');
    expect(post.quote?.quotedInlineContent).toBe(
      'RE: <a href="https://example.com/@bob/2">https://example.com/@bob/2</a>',
    );
  });

  test('leaves content unchanged when the quoted status URL is unavailable', () => {
    const status = createStatus({
      quote: {
        state: 'accepted',
        quotedStatus: createStatus({
          id: 'status-2',
          url: null,
        }),
      },
    });

    expect(convertStatus(status).content).toBe('<p>本文</p>');
  });

  test('converts attached poll data', () => {
    const status = createStatus({
      poll: {
        id: 'poll-1',
        expiresAt: '2026-06-19T00:00:00.000Z',
        expired: false,
        multiple: true,
        votesCount: 3,
        votersCount: 2,
        voted: true,
        ownVotes: [0, 1],
        options: [
          {
            title: 'Option A',
            votesCount: 2,
            emojis: [],
          },
          {
            title: 'Option B',
            emojis: [
              {
                shortcode: 'blobcat',
                url: 'https://example.com/blobcat.png',
                staticUrl: 'https://example.com/blobcat-static.png',
              },
            ],
          },
        ],
      },
    });

    expect(convertStatus(status).poll).toEqual({
      id: 'poll-1',
      expiresAt: '2026-06-19T00:00:00.000Z',
      expired: false,
      multiple: true,
      votesCount: 3,
      votersCount: 2,
      voted: true,
      ownVotes: [0, 1],
      options: [
        {
          title: 'Option A',
          votesCount: 2,
          emojis: [],
        },
        {
          title: 'Option B',
          votesCount: null,
          emojis: [
            {
              shortcode: 'blobcat',
              url: 'https://example.com/blobcat.png',
              staticUrl: 'https://example.com/blobcat-static.png',
            },
          ],
        },
      ],
    });
  });
});
