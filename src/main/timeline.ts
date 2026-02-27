import type { TimelineType, Post, PostVisibility } from '../shared/types.ts';
import { getRestClient, withRateLimit } from './apiClient.ts';

export async function fetchTimeline(
  serverUrl: string,
  accessToken: string,
  type: TimelineType,
  maxId?: string,
): Promise<Post[]> {
  const client = getRestClient(serverUrl, accessToken);

  const params = { maxId, limit: 20 };

  const statuses = await withRateLimit(serverUrl, async () => {
    switch (type) {
      case 'home':
        return client.v1.timelines.home.list(params);
      case 'public':
        return client.v1.timelines.public.list(params);
      case 'favourites':
        return client.v1.favourites.list(params);
      case 'notifications':
        return [];
    }
  });

  return statuses.map((status) => {
    // If this is a reblog, use the original post's content
    const original = status.reblog ?? status;
    const rebloggedBy = status.reblog
      ? {
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
        acct: original.account.acct,
        displayName: original.account.displayName,
        avatarUrl: original.account.avatar,
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
      favourited: status.favourited ?? false,
      reblogged: status.reblogged ?? false,
      bookmarked: status.bookmarked ?? false,
      rebloggedBy,
    };
  });
}
