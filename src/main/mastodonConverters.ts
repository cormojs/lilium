import log from 'electron-log/main';
import { DomUtils, parseDocument } from 'htmlparser2';
import type { mastodon } from 'masto';
import type {
  AccountProfile,
  AccountProfileField,
  MastoNotification,
  NotificationType,
  Post,
  PostQuote,
  PostVisibility,
  QuotedPost,
} from '../shared/types.ts';

const MISSKEY_NOTE_TRAILING_LINK_REGEX =
  /<a\b[^>]*\bhref=(["'])(https?:\/\/[^"']+\/notes\/[A-Za-z0-9_-]+(?:[?#][^"']*)?)\1[^>]*>[\s\S]*?<\/a>\s*(?:<\/p>\s*)?$/i;

export function isSupportedNotificationType(type: string): type is NotificationType {
  switch (type) {
    case 'follow':
    case 'follow_request':
    case 'favourite':
    case 'reblog':
      return true;
    default:
      return false;
  }
}

function toPostVisibility(visibility: mastodon.v1.Status['visibility']): PostVisibility {
  switch (visibility) {
    case 'public':
    case 'unlisted':
    case 'private':
    case 'direct':
      return visibility;
  }
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
    .filter((media) => media.url != null)
    .map((media) => ({
      id: media.id,
      type: media.type,
      url: media.url!,
      previewUrl: media.previewUrl ?? media.url!,
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
    visibility: toPostVisibility(status.visibility),
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractFallbackQuote(
  content: string,
): Pick<PostQuote, 'quotedInlineContent' | 'quotedUrl'> | undefined {
  const document = parseDocument(content);
  const quoteInlineElement = DomUtils.findOne(
    (element) => element.attribs['class']?.split(/\s+/).includes('quote-inline') ?? false,
    document,
  );

  if (quoteInlineElement) {
    const quoteInlineLink = DomUtils.findOne(
      (element) => element.name === 'a' && normalizeHttpUrl(element.attribs['href']) !== undefined,
      quoteInlineElement,
    );
    const quoteInlineUrl = normalizeHttpUrl(quoteInlineLink?.attribs['href']);
    const quoteInlineContent = DomUtils.getInnerHTML(quoteInlineElement).trim();

    log.info('[mastodonConverters] Parsed quote-inline element', {
      tagName: quoteInlineElement.name,
      quoteInlineUrl,
      quoteInlineContent,
    });

    if (quoteInlineUrl) {
      return {
        quotedUrl: quoteInlineUrl,
        quotedInlineContent: quoteInlineContent || undefined,
      };
    }
  }

  const misskeyNoteMatch = content.match(MISSKEY_NOTE_TRAILING_LINK_REGEX);
  const quotedUrl = normalizeHttpUrl(misskeyNoteMatch?.[2]);

  if (!quotedUrl) {
    return undefined;
  }

  return { quotedUrl };
}

function getQuotedStatusUrl(quote: NonNullable<mastodon.v1.Status['quote']>): string | undefined {
  if (!('quotedStatus' in quote) || !quote.quotedStatus) {
    return undefined;
  }

  return normalizeHttpUrl(quote.quotedStatus.url ?? undefined);
}

function appendMissingQuoteInline(content: string, quote: mastodon.v1.Status['quote']): string {
  if (!quote) {
    return content;
  }

  const fallbackQuote = extractFallbackQuote(content);

  if (fallbackQuote?.quotedInlineContent) {
    return content;
  }

  const quotedUrl = getQuotedStatusUrl(quote);

  if (!quotedUrl) {
    return content;
  }

  const escapedQuotedUrl = escapeHtml(quotedUrl);
  return `${content}<p class="quote-inline">RE: <a href="${escapedQuotedUrl}">${escapedQuotedUrl}</a></p>`;
}

function convertQuote(quote: mastodon.v1.Status['quote'], content: string): PostQuote | undefined {
  if (!quote) {
    return undefined;
  }

  const fallbackQuote = extractFallbackQuote(content);

  return {
    state: quote.state,
    quotedStatusId: 'quotedStatusId' in quote ? (quote.quotedStatusId ?? undefined) : undefined,
    quotedUrl: getQuotedStatusUrl(quote) ?? fallbackQuote?.quotedUrl,
    quotedInlineContent: fallbackQuote?.quotedInlineContent,
    quotedPost:
      'quotedStatus' in quote && quote.quotedStatus
        ? convertQuotedStatus(quote.quotedStatus)
        : undefined,
  };
}

function convertFallbackQuote(content: string): PostQuote | undefined {
  const fallbackQuote = extractFallbackQuote(content);

  if (!fallbackQuote) {
    return undefined;
  }

  return {
    state: 'accepted',
    ...fallbackQuote,
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
  const content = appendMissingQuoteInline(original.content, original.quote);
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
    content,
    createdAt: original.createdAt,
    spoilerText: original.spoilerText,
    sensitive: original.sensitive,
    url: original.url ?? null,
    visibility: toPostVisibility(original.visibility),
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
    quote: convertQuote(original.quote, content) ?? convertFallbackQuote(content),
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
