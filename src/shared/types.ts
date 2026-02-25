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
export type TimelineType = 'home' | 'public' | 'favourites';

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
