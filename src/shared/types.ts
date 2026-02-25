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
