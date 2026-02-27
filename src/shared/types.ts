/** Persisted account information */
export interface Account {
  /** Mastodon server URL (e.g. "https://mastodon.social") */
  serverUrl: string;
  /** OAuth access token (stored encrypted at rest) */
  accessToken: string;
  /** Username (e.g. "alice") */
  username: string;
  /** Display name */
  displayName: string;
  /** Avatar URL */
  avatarUrl: string;
}

/** Result of starting the OAuth login flow */
export interface OAuthStartLoginResult {
  /** URL the user should open in a browser to authorize */
  authorizeUrl: string;
  /** Client ID for the registered app (needed for token exchange) */
  clientId: string;
  /** Client secret for the registered app (needed for token exchange) */
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
export type TimelineType = 'home' | 'public' | 'favourites' | 'notifications';

/** Media attachment type */
export type MediaAttachmentType = 'image' | 'video' | 'gifv' | 'audio' | 'unknown';

/** A media attachment on a post */
export interface PostMediaAttachment {
  id: string;
  type: MediaAttachmentType;
  /** Full-size URL */
  url: string;
  /** Scaled-down preview URL */
  previewUrl: string;
  /** Alt text */
  description: string | null;
}

/** A post (status) to render in the timeline */
export interface Post {
  id: string;
  /** HTML content */
  content: string;
  /** Content warning text */
  spoilerText: string;
  /** Whether media should be treated as sensitive */
  sensitive: boolean;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** Original URL of the post (may be null for some posts) */
  url: string | null;
  account: {
    acct: string;
    displayName: string;
    avatarUrl: string;
  };
  /** Media attachments (images, videos, etc.) */
  mediaAttachments: PostMediaAttachment[];
  /** Visibility of the post */
  visibility: PostVisibility;
  /** Whether the current user has favourited this post */
  favourited: boolean;
  /** Whether the current user has reblogged this post */
  reblogged: boolean;
  /** Whether the current user has bookmarked this post */
  bookmarked: boolean;
  /** If this post is a boost, info about who boosted it */
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
  /** For pagination — fetch posts older than this ID */
  maxId?: string;
}

/** Tab definition for the timeline view */
export interface TabDefinition {
  id: string;
  accountServerUrl: string;
  accountUsername: string;
  timelineType: TimelineType;
}

export type StreamType = 'user' | 'public';

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
  /** ISO 8601 timestamp */
  createdAt: string;
  account: {
    acct: string;
    displayName: string;
    avatarUrl: string;
  };
  /** The target post for favourite/reblog notifications */
  status?: Post;
}

export interface NotificationFetchParams {
  serverUrl: string;
  accessToken: string;
  /** For pagination — fetch notifications older than this ID */
  maxId?: string;
}

export type PostVisibility = 'public' | 'unlisted' | 'private' | 'direct';

export interface StatusCreateParams {
  serverUrl: string;
  accessToken: string;
  status: string;
  visibility: PostVisibility;
}

/** Parameters for status actions (favourite, reblog, bookmark) */
export interface StatusActionParams {
  serverUrl: string;
  accessToken: string;
  statusId: string;
}

/** Application display settings */
export interface AppSettings {
  /** Avatar icon size in pixels */
  avatarSize: number;
  /** Boost avatar icon size in pixels */
  boostAvatarSize: number;
  /** Post body font size in pixels */
  postFontSize: number;
  /** UI font size (acct, display name, timestamp, etc.) in pixels */
  uiFontSize: number;
}
