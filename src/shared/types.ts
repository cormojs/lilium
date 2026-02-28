import type { mastodon } from 'masto';

export type MastodonStatus = mastodon.v1.Status;
export type MastodonNotification = mastodon.v1.Notification;

export type PostVisibility = 'public' | 'unlisted' | 'private' | 'direct';

export interface Account {
  serverUrl: string;
  accessToken: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface TabDefinition {
  id: string;
  accountServerUrl: string;
  accountUsername: string;
  timelineType: TimelineType;
  customName?: string;
}

/**
 * Notification event forwarded from main process to renderer via IPC
 */
export interface NotificationEvent {
  type: 'favourite' | 'reblog' | 'mention' | 'follow' | 'poll' | 'update' | 'status' | string;
  accountDisplayName: string;
  accountAcct: string;
  statusContent?: string;
}

/**
 * Status event from timeline (streaming or polling)
 */
export interface StatusEvent {
  tabId: string;
  status: MastodonStatus;
}

/**
 * Timeline data update from main process to renderer
 */
export interface TimelineData {
  tabId: string;
  statuses: MastodonStatus[];
  isStreaming: boolean;
}

/**
 * Notification data update from main process to renderer
 */
export interface NotificationData {
  tabId: string;
  notifications: MastodonNotification[];
  isStreaming: boolean;
}

/**
 * Parameters for fetching older timeline statuses (infinite scroll)
 */
export interface FetchOlderParams {
  tabId: string;
  maxId: string;
}

/**
 * Parameters for fetching older notifications (infinite scroll)
 */
export interface FetchOlderNotificationsParams {
  tabId: string;
  maxId: string;
}

/**
 * Result of fetching older timeline statuses
 */
export interface FetchOlderResult {
  tabId: string;
  statuses: MastodonStatus[];
}

/**
 * Result of fetching older notifications
 */
export interface FetchOlderNotificationsResult {
  tabId: string;
  notifications: MastodonNotification[];
}

/**
 * Custom emoji data for rendering in timeline
 */
export interface CustomEmoji {
  shortcode: string;
  url: string;
  staticUrl: string;
  visibleInPicker: boolean;
  category?: string;
}

/**
 * Parameters for fetching custom emojis
 */
export interface FetchCustomEmojisParams {
  serverUrl: string;
  accessToken: string;
}

/**
 * Payload for requesting a tab connection/streaming setup
 */
export interface TabConnectionPayload {
  tab: TabDefinition;
}

/**
 * Connection status update for a tab
 */
export interface TabConnectionStatusEvent {
  tabId: string;
  isStreaming: boolean;
}

/**
 * Represents saved account data in persistent storage
 */
export interface SavedAccount {
  serverUrl: string;
  accessToken: string;
}

/**
 * Login success result with account information
 */
export interface LoginResult {
  serverUrl: string;
  accessToken: string;
  username: string;
  avatarUrl: string;
}

/**
 * Parameters for creating a new status
 */
export interface StatusCreateParams {
  serverUrl: string;
  accessToken: string;
  status: string;
  spoilerText?: string;
  visibility: PostVisibility;
  inReplyToId?: string;
  mediaIds?: string[];
}

export interface MediaUploadParams {
  serverUrl: string;
  accessToken: string;
  fileName: string;
  mimeType: string;
  data: Uint8Array;
}

export interface UploadedMedia {
  id: string;
  previewUrl: string;
  url: string;
}

/** Parameters for status actions (favourite, reblog, bookmark) */
export interface StatusActionParams {
  serverUrl: string;
  accessToken: string;
  statusId: string;
}

/** Result of starting the OAuth login flow */
export interface OAuthStartLoginResult {
  authorizeUrl: string;
  clientId: string;
  clientSecret: string;
}

/** Parameters for exchanging an authorization code */
export interface OAuthExchangeTokenParams {
  serverUrl: string;
  clientId: string;
  clientSecret: string;
  code: string;
}

/** Timeline type */
export type TimelineType = 'home' | 'public' | 'local' | 'favourites' | 'notifications';

/** Media attachment type */
export type MediaAttachmentType = 'image' | 'video' | 'gifv' | 'audio' | 'unknown';

/** A media attachment on a post */
export interface PostMediaAttachment {
  id: string;
  type: MediaAttachmentType;
  url: string;
  previewUrl: string;
  description: string | null;
}

/** Custom emoji in a post or account display name */
export interface PostCustomEmoji {
  shortcode: string;
  url: string;
  staticUrl: string;
}

/** A post (status) to render in the timeline */
export interface Post {
  id: string;
  content: string;
  spoilerText: string;
  sensitive: boolean;
  createdAt: string;
  url: string | null;
  account: {
    acct: string;
    displayName: string;
    avatarUrl: string;
    emojis: PostCustomEmoji[];
  };
  mediaAttachments: PostMediaAttachment[];
  visibility: PostVisibility;
  favourited: boolean;
  reblogged: boolean;
  bookmarked: boolean;
  emojis: PostCustomEmoji[];
  rebloggedBy?: {
    acct: string;
    displayName: string;
    avatarUrl: string;
  };
}

/** Parameters for fetching a timeline */
export interface TimelineFetchParams {
  serverUrl: string;
  accessToken: string;
  type: TimelineType;
  maxId?: string;
}

export interface PaneDefinition {
  id: string;
  tabIds: string[];
  activeTabId: string;
  widthRatio: number;
}

export interface PaneLayout {
  panes: PaneDefinition[];
}

export type StreamType = 'user' | 'public' | 'publicLocal';

export interface StreamSubscribeParams {
  serverUrl: string;
  accessToken: string;
  streamType: StreamType;
  subscriptionId: string;
}

export interface StreamEventData {
  subscriptionId: string;
  event: 'update' | 'notification' | 'delete';
  payload: Post | MastoNotification | string;
}

export type NotificationType = 'follow' | 'follow_request' | 'favourite' | 'reblog';

export interface MastoNotification {
  id: string;
  type: NotificationType;
  createdAt: string;
  account: {
    acct: string;
    displayName: string;
    avatarUrl: string;
    emojis: PostCustomEmoji[];
  };
  status?: Post;
}

export interface NotificationFetchParams {
  serverUrl: string;
  accessToken: string;
  maxId?: string;
}

export interface ShowNotificationParams {
  title: string;
  body?: string;
  iconUrl?: string;
}

/** Connection status of a stream subscription */
export type StreamConnectionStatus = 'streaming' | 'polling' | 'disconnected';

export interface StreamConnectionStatusData {
  subscriptionId: string;
  status: StreamConnectionStatus;
}

/** Application display settings */
export interface AppSettings {
  avatarSize: number;
  boostAvatarSize: number;
  postFontSize: number;
  uiFontSize: number;
  compactFontSize: number;
}
