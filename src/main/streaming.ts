import { createRestAPIClient, createStreamingAPIClient } from 'masto';
import type { mastodon } from 'masto';
import type { WebContents } from 'electron';
import type {
  MastoNotification,
  Post,
  PostVisibility,
  StreamEventData,
  StreamSubscribeParams,
  StreamType,
} from '../shared/types.ts';
import { IpcChannels } from '../shared/ipc.ts';

interface ActiveSubscription {
  subscription: mastodon.streaming.Subscription;
  client: mastodon.streaming.Client;
  abortController: AbortController;
}

const activeSubscriptions = new Map<string, ActiveSubscription>();

function convertStatus(status: mastodon.v1.Status): Post {
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
}

function convertNotification(n: mastodon.v1.Notification): MastoNotification {
  const result: MastoNotification = {
    id: n.id,
    type: n.type as MastoNotification['type'],
    createdAt: n.createdAt,
    account: {
      acct: n.account.acct,
      displayName: n.account.displayName,
      avatarUrl: n.account.avatar,
    },
  };

  if (n.status) {
    result.status = convertStatus(n.status);
  }

  return result;
}

async function getStreamingApiUrl(serverUrl: string, accessToken: string): Promise<string> {
  const rest = createRestAPIClient({ url: serverUrl, accessToken });
  const instance = await rest.v2.instance.fetch();
  return instance.configuration.urls.streaming;
}

function subscribe(
  streamingClient: mastodon.streaming.Client,
  streamType: StreamType,
): mastodon.streaming.Subscription {
  switch (streamType) {
    case 'user':
      return streamingClient.user.subscribe();
    case 'public':
      return streamingClient.public.subscribe();
  }
}

export async function subscribeStream(
  params: StreamSubscribeParams,
  webContents: WebContents,
): Promise<void> {
  // Unsubscribe existing subscription with the same ID
  if (activeSubscriptions.has(params.subscriptionId)) {
    unsubscribeStream(params.subscriptionId);
  }

  const streamingApiUrl = await getStreamingApiUrl(params.serverUrl, params.accessToken);
  const streamingClient = createStreamingAPIClient({
    streamingApiUrl,
    accessToken: params.accessToken,
    retry: true,
  });

  const subscription = subscribe(streamingClient, params.streamType);
  const abortController = new AbortController();

  activeSubscriptions.set(params.subscriptionId, {
    subscription,
    client: streamingClient,
    abortController,
  });

  // Process events in background
  (async () => {
    try {
      for await (const event of subscription) {
        if (abortController.signal.aborted) break;
        if (webContents.isDestroyed()) break;

        let eventData: StreamEventData | null = null;

        switch (event.event) {
          case 'update':
            eventData = {
              subscriptionId: params.subscriptionId,
              event: 'update',
              payload: convertStatus(event.payload),
            };
            break;
          case 'notification':
            eventData = {
              subscriptionId: params.subscriptionId,
              event: 'notification',
              payload: convertNotification(event.payload),
            };
            break;
          case 'delete':
            eventData = {
              subscriptionId: params.subscriptionId,
              event: 'delete',
              payload: event.payload,
            };
            break;
        }

        if (eventData) {
          webContents.send(IpcChannels.StreamEvent, eventData);
        }
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        console.error(`Streaming error for ${params.subscriptionId}:`, e);
      }
    } finally {
      // Clean up when the loop exits for any reason
      // (webContents destroyed, server disconnect, error, abort)
      unsubscribeStream(params.subscriptionId);
    }
  })();
}

export function unsubscribeStream(subscriptionId: string): void {
  const active = activeSubscriptions.get(subscriptionId);
  if (active) {
    active.abortController.abort();
    active.subscription.unsubscribe();
    active.client.close();
    activeSubscriptions.delete(subscriptionId);
  }
}

export function unsubscribeAllStreams(): void {
  for (const subscriptionId of activeSubscriptions.keys()) {
    unsubscribeStream(subscriptionId);
  }
}
