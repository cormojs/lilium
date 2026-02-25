import { createRestAPIClient } from 'masto';
import type { TimelineType, Post } from '../shared/types.ts';

export async function fetchTimeline(
  serverUrl: string,
  accessToken: string,
  type: TimelineType,
  maxId?: string,
): Promise<Post[]> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });

  const params = { maxId, limit: 20 };

  let statuses;
  switch (type) {
    case 'home':
      statuses = await client.v1.timelines.home.list(params);
      break;
    case 'public':
      statuses = await client.v1.timelines.public.list(params);
      break;
    case 'favourites':
      statuses = await client.v1.favourites.list(params);
      break;
  }

  return statuses.map((status) => ({
    id: status.id,
    content: status.content,
    createdAt: status.createdAt,
    url: status.url ?? null,
    account: {
      acct: status.account.acct,
      displayName: status.account.displayName,
      avatarUrl: status.account.avatar,
    },
    mediaAttachments: status.mediaAttachments
      .filter((m) => m.url != null && m.previewUrl != null)
      .map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url!,
        previewUrl: m.previewUrl!,
        description: m.description ?? null,
      })),
  }));
}
