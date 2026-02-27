import { createRestAPIClient, createStreamingAPIClient } from 'masto';
import type { mastodon } from 'masto';
import type { WebContents } from 'electron';
import type {
  MastoNotification,
  Post,
  PostVisibility,
  StreamConnectionStatus,
  StreamEventData,
  StreamSubscribeParams,
  StreamType,
} from '../shared/types.ts';
import { IpcChannels } from '../shared/ipc.ts';

const POLLING_INTERVAL_MS = 60_000;
const STREAM_RETRY_INTERVAL_MS = 30_000;
const NOTIFICATION_TYPES = ['follow', 'follow_request', 'favourite', 'reblog'] as const;

interface StreamingHandles {
  subscription: mastodon.streaming.Subscription;
  client: mastodon.streaming.Client;
}

interface PollingCursor {
  statusSinceId?: string;
  notificationSinceId?: string;
}

interface ActiveSubscription {
  params: StreamSubscribeParams;
  webContents: WebContents;
  abortController: AbortController;
  streaming?: StreamingHandles;
  retryTimer?: ReturnType<typeof setTimeout>;
  pollingTimer?: ReturnType<typeof setInterval>;
  pollingClient?: mastodon.rest.Client;
  cursor: PollingCursor;
}

const activeSubscriptions = new Map<string, ActiveSubscription>();

function convertStatus(status: mastodon.v1.Status): Post {
  const original = status.reblog ?? status;
  const rebloggedBy = status.reblog
    ? {
        acct: status.account.acct,
        displayName: status.account.displayName,
        avatarUrl: status.account.avatar,
        emojis: status.account.emojis.map((e) => ({
          shortcode: e.shortcode,
          url: e.url,
          staticUrl: e.staticUrl,
        })),
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
      emojis: n.account.emojis.map((e) => ({
        shortcode: e.shortcode,
        url: e.url,
        staticUrl: e.staticUrl,
      })),
    },
  };

  if (n.status) {
    result.status = convertStatus(n.status);
  }

  return result;
}

function isActive(active: ActiveSubscription): boolean {
  return (
    !active.abortController.signal.aborted &&
    activeSubscriptions.get(active.params.subscriptionId) === active
  );
}

function sendStreamEvent(active: ActiveSubscription, eventData: StreamEventData): void {
  if (!isActive(active) || active.webContents.isDestroyed()) {
    return;
  }

  active.webContents.send(IpcChannels.StreamEvent, eventData);
}

function sendConnectionStatus(active: ActiveSubscription, status: StreamConnectionStatus): void {
  if (!isActive(active) || active.webContents.isDestroyed()) {
    return;
  }

  active.webContents.send(IpcChannels.StreamConnectionStatus, {
    subscriptionId: active.params.subscriptionId,
    status,
  });
}

function compareMastodonId(a: string, b: string): number {
  try {
    const diff = BigInt(a) - BigInt(b);
    if (diff > 0n) return 1;
    if (diff < 0n) return -1;
    return 0;
  } catch {
    return a.localeCompare(b);
  }
}

function maxMastodonId(ids: string[]): string | undefined {
  return ids.reduce<string | undefined>((maxId, id) => {
    if (!maxId) return id;
    return compareMastodonId(id, maxId) > 0 ? id : maxId;
  }, undefined);
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

function cleanupStreaming(active: ActiveSubscription): void {
  if (!active.streaming) return;

  active.streaming.subscription.unsubscribe();
  active.streaming.client.close();
  active.streaming = undefined;
}

function scheduleStreamingRetry(active: ActiveSubscription): void {
  if (!isActive(active) || active.retryTimer) {
    return;
  }

  active.retryTimer = setTimeout(() => {
    active.retryTimer = undefined;
    void startStreaming(active);
  }, STREAM_RETRY_INTERVAL_MS);
}

function stopPolling(active: ActiveSubscription): void {
  if (active.pollingTimer) {
    clearInterval(active.pollingTimer);
    active.pollingTimer = undefined;
  }
}

async function pollUserStream(active: ActiveSubscription): Promise<void> {
  if (!active.pollingClient) {
    active.pollingClient = createRestAPIClient({
      url: active.params.serverUrl,
      accessToken: active.params.accessToken,
    });
  }

  const [statuses, notifications] = await Promise.all([
    active.pollingClient.v1.timelines.home.list({
      sinceId: active.cursor.statusSinceId,
      limit: 20,
    }),
    active.pollingClient.v1.notifications.list({
      sinceId: active.cursor.notificationSinceId,
      limit: 20,
      types: [...NOTIFICATION_TYPES],
    }),
  ]);

  const statusSinceId = maxMastodonId(statuses.map((status) => status.id));
  if (statusSinceId) {
    active.cursor.statusSinceId = statusSinceId;
  }

  const notificationSinceId = maxMastodonId(notifications.map((notification) => notification.id));
  if (notificationSinceId) {
    active.cursor.notificationSinceId = notificationSinceId;
  }

  for (const status of [...statuses].reverse()) {
    sendStreamEvent(active, {
      subscriptionId: active.params.subscriptionId,
      event: 'update',
      payload: convertStatus(status),
    });
  }

  const filteredNotifications = notifications.filter((notification) =>
    NOTIFICATION_TYPES.includes(notification.type as (typeof NOTIFICATION_TYPES)[number]),
  );

  for (const notification of [...filteredNotifications].reverse()) {
    sendStreamEvent(active, {
      subscriptionId: active.params.subscriptionId,
      event: 'notification',
      payload: convertNotification(notification),
    });
  }
}

async function pollPublicStream(active: ActiveSubscription): Promise<void> {
  if (!active.pollingClient) {
    active.pollingClient = createRestAPIClient({
      url: active.params.serverUrl,
      accessToken: active.params.accessToken,
    });
  }

  const statuses = await active.pollingClient.v1.timelines.public.list({
    sinceId: active.cursor.statusSinceId,
    limit: 20,
  });

  const statusSinceId = maxMastodonId(statuses.map((status) => status.id));
  if (statusSinceId) {
    active.cursor.statusSinceId = statusSinceId;
  }

  for (const status of [...statuses].reverse()) {
    sendStreamEvent(active, {
      subscriptionId: active.params.subscriptionId,
      event: 'update',
      payload: convertStatus(status),
    });
  }
}

async function pollOnce(active: ActiveSubscription): Promise<void> {
  if (!isActive(active)) {
    return;
  }

  try {
    if (active.params.streamType === 'user') {
      await pollUserStream(active);
    } else {
      await pollPublicStream(active);
    }
  } catch (error) {
    console.error(`Polling error for ${active.params.subscriptionId}:`, error);
  }
}

function startPolling(active: ActiveSubscription): void {
  if (!isActive(active) || active.pollingTimer) {
    return;
  }

  void pollOnce(active);
  active.pollingTimer = setInterval(() => {
    void pollOnce(active);
  }, POLLING_INTERVAL_MS);
}

function handleStreamingFailure(
  active: ActiveSubscription,
  context: string,
  error?: unknown,
): void {
  if (!isActive(active)) {
    return;
  }

  if (error) {
    console.error(`Streaming ${context} for ${active.params.subscriptionId}:`, error);
  } else {
    console.warn(`Streaming ${context} for ${active.params.subscriptionId}`);
  }

  cleanupStreaming(active);
  startPolling(active);
  sendConnectionStatus(active, 'polling');
  scheduleStreamingRetry(active);
}

async function startStreaming(active: ActiveSubscription): Promise<void> {
  if (!isActive(active)) {
    return;
  }

  try {
    const streamingApiUrl = await getStreamingApiUrl(
      active.params.serverUrl,
      active.params.accessToken,
    );
    if (!isActive(active)) {
      return;
    }

    const streamingClient = createStreamingAPIClient({
      streamingApiUrl,
      accessToken: active.params.accessToken,
      retry: true,
    });

    const subscription = subscribe(streamingClient, active.params.streamType);
    active.streaming = {
      subscription,
      client: streamingClient,
    };

    if (active.retryTimer) {
      clearTimeout(active.retryTimer);
      active.retryTimer = undefined;
    }
    stopPolling(active);
    sendConnectionStatus(active, 'streaming');

    for await (const event of subscription) {
      if (!isActive(active) || active.webContents.isDestroyed()) {
        break;
      }

      let eventData: StreamEventData | null = null;

      switch (event.event) {
        case 'update':
          eventData = {
            subscriptionId: active.params.subscriptionId,
            event: 'update',
            payload: convertStatus(event.payload),
          };
          break;
        case 'notification':
          eventData = {
            subscriptionId: active.params.subscriptionId,
            event: 'notification',
            payload: convertNotification(event.payload),
          };
          break;
        case 'delete':
          eventData = {
            subscriptionId: active.params.subscriptionId,
            event: 'delete',
            payload: event.payload,
          };
          break;
      }

      if (eventData) {
        sendStreamEvent(active, eventData);
      }
    }

    if (isActive(active)) {
      handleStreamingFailure(active, 'stopped unexpectedly');
    }
  } catch (error) {
    handleStreamingFailure(active, 'failed', error);
  }
}

export async function subscribeStream(
  params: StreamSubscribeParams,
  webContents: WebContents,
): Promise<void> {
  if (activeSubscriptions.has(params.subscriptionId)) {
    unsubscribeStream(params.subscriptionId);
  }

  const active: ActiveSubscription = {
    params,
    webContents,
    abortController: new AbortController(),
    cursor: {},
  };

  activeSubscriptions.set(params.subscriptionId, active);
  await startStreaming(active);
}

export function unsubscribeStream(subscriptionId: string): void {
  const active = activeSubscriptions.get(subscriptionId);
  if (!active) {
    return;
  }

  active.abortController.abort();

  if (active.retryTimer) {
    clearTimeout(active.retryTimer);
    active.retryTimer = undefined;
  }

  stopPolling(active);
  cleanupStreaming(active);
  activeSubscriptions.delete(subscriptionId);
}

export function unsubscribeAllStreams(): void {
  for (const subscriptionId of activeSubscriptions.keys()) {
    unsubscribeStream(subscriptionId);
  }
}
