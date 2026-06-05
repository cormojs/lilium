import { createRestAPIClient } from 'masto';
import type { MastoNotification } from '../shared/types.ts';
import { convertNotification, isSupportedNotificationType } from './mastodonConverters.ts';

export async function fetchNotifications(
  serverUrl: string,
  accessToken: string,
  maxId?: string,
): Promise<MastoNotification[]> {
  const client = createRestAPIClient({ url: serverUrl, accessToken });

  const notifications = await client.v1.notifications.list({
    maxId,
    limit: 20,
    types: ['follow', 'follow_request', 'favourite', 'reblog'],
  });

  return notifications
    .filter((notification) => isSupportedNotificationType(notification.type))
    .map(convertNotification);
}
