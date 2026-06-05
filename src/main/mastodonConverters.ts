import type { mastodon } from 'masto';
import type {
  AccountProfile,
  AccountProfileField,
  MastoNotification,
  Post,
  PostVisibility,
} from '../shared/types.ts';

const NOTIFICATION_TYPES = ['follow', 'follow_request', 'favourite', 'reblog'] as const;

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
    mediaAttachments: original.mediaAttachments
      .filter((media) => media.url != null && media.previewUrl != null)
      .map((media) => ({
        id: media.id,
        type: media.type,
        url: media.url!,
        previewUrl: media.previewUrl!,
        description: media.description ?? null,
      })),
    emojis: convertEmojis(original.emojis),
    favourited: status.favourited ?? false,
    reblogged: status.reblogged ?? false,
    bookmarked: status.bookmarked ?? false,
    rebloggedBy,
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
