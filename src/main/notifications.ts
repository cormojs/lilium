import { createRestAPIClient } from 'masto';
import type { MastoNotification, Post, PostVisibility } from '../shared/types.ts';

const NOTIFICATION_TYPES = ['follow', 'follow_request', 'favourite', 'reblog'] as const;

export async function fetchNotifications(
  serverUrl: string,
  accessToken: string,
  maxId?: string,
): Promise<MastoNotification[]> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });

  const notifications = await client.v1.notifications.list({
    maxId,
    limit: 20,
    types: [...NOTIFICATION_TYPES],
  });

  return notifications
    .filter((n) => NOTIFICATION_TYPES.includes(n.type as (typeof NOTIFICATION_TYPES)[number]))
    .map((n) => {
      const result: MastoNotification = {
        id: n.id,
        type: n.type as MastoNotification['type'],
        createdAt: n.createdAt,
        account: {
          acct: n.account.acct,
          displayName: n.account.displayName,
          avatarUrl: n.account.avatar,
          emojis: n.account.emojis.map((e) => ({
            shortcode: e.shortcode,
            url: e.url,
            staticUrl: e.staticUrl,
          })),
        },
      };

      if (n.status) {
        const original = n.status.reblog ?? n.status;
        const status: Post = {
          id: n.status.id,
          content: original.content,
          spoilerText: original.spoilerText,
          sensitive: original.sensitive,
          createdAt: original.createdAt,
          url: original.url ?? null,
          visibility: original.visibility as PostVisibility,
          account: {
            acct: original.account.acct,
            displayName: original.account.displayName,
            avatarUrl: original.account.avatar,
            emojis: original.account.emojis.map((e) => ({
              shortcode: e.shortcode,
              url: e.url,
              staticUrl: e.staticUrl,
            })),
          },
          mediaAttachments: original.mediaAttachments
            .filter((m) => m.url != null && m.previewUrl != null)
            .map((m) => ({
              id: m.id,
              type: m.type,
              url: m.url!,
              previewUrl: m.previewUrl!,
              description: m.description ?? null,
            })),
          emojis: original.emojis.map((emoji) => ({
            shortcode: emoji.shortcode,
            url: emoji.url,
            staticUrl: emoji.staticUrl,
          })),
          favourited: n.status.favourited ?? false,
          reblogged: n.status.reblogged ?? false,
          bookmarked: n.status.bookmarked ?? false,
        };
        result.status = status;
      }

      return result;
    });
}
