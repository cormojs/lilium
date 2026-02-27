import type { mastodon } from 'masto';

export type MastodonStatus = mastodon.v1.Status;
export type MastodonNotification = mastodon.v1.Notification;

export type PostVisibility = 'public' | 'unlisted' | 'private' | 'direct';

export interface Account {
  serverUrl: string;
  accessToken: string;
  username: string;
  avatarUrl: string;
}

export interface TabDefinition {
  id: string;
  label: string;
  type: 'home' | 'local' | 'federated' | 'notifications' | 'hashtag' | 'list';
  account: Account;
  hashtag?: string;
  listId?: string;
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
