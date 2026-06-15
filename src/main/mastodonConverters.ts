import type { mastodon } from 'masto';
import type {
  AccountProfile,
  AccountProfileField,
  MastoNotification,
  Post,
  PostQuote,
  PostVisibility,
  QuotedPost,
} from '../shared/types.ts';

const NOTIFICATION_TYPES = ['follow', 'follow_request', 'favourite', 'reblog'] as const;
const QUOTE_INLINE_HREF_REGEX =
  /<p\b(?=[^>]*\bclass=(["'])[^"']*\bquote-inline\b[^"']*\1)[^>]*>[\s\S]*?<a\b[^>]*\bhref=(["'])(https?:\/\/[^"']+)\2/i;
const MISSKEY_NOTE_TRAILING_LINK_REGEX =
  /<a\b[^>]*\bhref=(["'])(https?:\/\/[^"']+\/notes\/[A-Za-z0-9_-]+(?:[?#][^"']*)?)\1[^>]*>[\s\S]*?<\/a>\s*(?:<\/p>\s*)?$/i;

export function isSupportedNotificationType(
  type: string,
): type is (typeof NOTIFICATION_TYPES)[number] {
  return NOTIFICATION_TYPES.includes(type as (typeof NOTIFICATION_TYPES)[number]);
}

function convertEmojis(emojis: mastodon.v1.CustomEmoji[]): Post['emojis'] {
  return emojis.map((emoji) => ({
    shortcode: emoji.shortcode,
    url: emoji.url,
    staticUrl: emoji.staticUrl,
  }));
}

function convertFields(fields: mastodon.v1.AccountField[]): AccountProfileField[] {
  return fields.map((field) => ({
    name: field.name,
    value: field.value,
    verifiedAt: field.verifiedAt ?? null,
  }));
}

function convertMediaAttachments(
  mediaAttachments: mastodon.v1.MediaAttachment[],
): Post['mediaAttachments'] {
  return mediaAttachments
    .filter((media) => media.url != null && media.previewUrl != null)
    .map((media) => ({
      id: media.id,
      type: media.type,
      url: media.url!,
      previewUrl: media.previewUrl!,
      description: media.description ?? null,
    }));
}

function convertQuotedStatus(status: mastodon.v1.Status): QuotedPost {
  return {
    id: status.id,
    content: status.content,
    createdAt: status.createdAt,
    spoilerText: status.spoilerText,
    sensitive: status.sensitive,
    url: status.url ?? null,
    visibility: status.visibility as PostVisibility,
    account: {
      id: status.account.id,
      acct: status.account.acct,
      displayName: status.account.displayName,
      avatarUrl: status.account.avatar,
      emojis: convertEmojis(status.account.emojis),
    },
    mediaAttachments: convertMediaAttachments(status.mediaAttachments),
    emojis: convertEmojis(status.emojis),
  };
}

function normalizeHttpUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

function extractFallbackQuoteUrl(content: string): string | undefined {
  const quoteInlineMatch = content.match(QUOTE_INLINE_HREF_REGEX);
  const quoteInlineUrl = normalizeHttpUrl(quoteInlineMatch?.[3]);

  if (quoteInlineUrl) {
    return quoteInlineUrl;
  }

  const misskeyNoteMatch = content.match(MISSKEY_NOTE_TRAILING_LINK_REGEX);

  return normalizeHttpUrl(misskeyNoteMatch?.[2]);
}

function convertQuote(quote: mastodon.v1.Status['quote']): PostQuote | undefined {
  if (!quote) {
    return undefined;
  }

  return {
    state: quote.state,
    quotedStatusId: 'quotedStatusId' in quote ? (quote.quotedStatusId ?? undefined) : undefined,
    quotedPost:
      'quotedStatus' in quote && quote.quotedStatus
        ? convertQuotedStatus(quote.quotedStatus)
        : undefined,
  };
}

function convertFallbackQuote(content: string): PostQuote | undefined {
  const quotedUrl = extractFallbackQuoteUrl(content);

  if (!quotedUrl) {
    return undefined;
  }

  return {
    state: 'accepted',
    quotedUrl,
  };
}

export function convertAccount(account: mastodon.v1.Account): AccountProfile {
  return {
    id: account.id,
    acct: account.acct,
    username: account.username,
    displayName: account.displayName,
    note: account.note,
    avatarUrl: account.avatar,
    headerUrl: account.header,
    url: account.url,
    followersCount: account.followersCount,
    followingCount: account.followingCount,
    statusesCount: account.statusesCount,
    following: false,
    requested: false,
    emojis: convertEmojis(account.emojis),
    fields: convertFields(account.fields),
  };
}

export function convertStatus(status: mastodon.v1.Status): Post {
  const original = status.reblog ?? status;
  const rebloggedBy = status.reblog
    ? {
        id: status.account.id,
        acct: status.account.acct,
        displayName: status.account.displayName,
        avatarUrl: status.account.avatar,
      }
    : undefined;

  return {
    id: status.id,
    content: original.content,
    createdAt: original.createdAt,
    spoilerText: original.spoilerText,
    sensitive: original.sensitive,
    url: original.url ?? null,
    visibility: original.visibility as PostVisibility,
    account: {
      id: original.account.id,
      acct: original.account.acct,
      displayName: original.account.displayName,
      avatarUrl: original.account.avatar,
      emojis: convertEmojis(original.account.emojis),
    },
    mediaAttachments: convertMediaAttachments(original.mediaAttachments),
    emojis: convertEmojis(original.emojis),
    favourited: status.favourited ?? false,
    reblogged: status.reblogged ?? false,
    bookmarked: status.bookmarked ?? false,
    rebloggedBy,
    quote: convertQuote(original.quote) ?? convertFallbackQuote(original.content),
  };
}

export function convertNotification(notification: mastodon.v1.Notification): MastoNotification {
  const result: MastoNotification = {
    id: notification.id,
    type: notification.type as MastoNotification['type'],
    createdAt: notification.createdAt,
    account: {
      id: notification.account.id,
      acct: notification.account.acct,
      displayName: notification.account.displayName,
      avatarUrl: notification.account.avatar,
      emojis: convertEmojis(notification.account.emojis),
    },
  };

  if (notification.status) {
    result.status = convertStatus(notification.status);
  }

  return result;
}
