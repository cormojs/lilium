import { createRestAPIClient, createOAuthAPIClient } from 'masto';
import type { OAuthStartLoginResult, Account } from '../shared/types.ts';

const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
const SCOPES = 'read write push';

/**
 * Register an OAuth app on the given Mastodon server and return the authorization URL.
 */
export async function startLogin(serverUrl: string): Promise<OAuthStartLoginResult> {
  const url = normalizeServerUrl(serverUrl);
  const rest = createRestAPIClient({ url });

  const app = await rest.v1.apps.create({
    clientName: 'lilium',
    redirectUris: REDIRECT_URI,
    scopes: SCOPES,
  });

  if (!app.clientId || !app.clientSecret) {
    throw new Error('Failed to register app: missing client credentials');
  }

  const authorizeUrl = new URL('/oauth/authorize', url);
  authorizeUrl.searchParams.set('client_id', app.clientId);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', SCOPES);

  return {
    authorizeUrl: authorizeUrl.toString(),
    clientId: app.clientId,
    clientSecret: app.clientSecret,
  };
}

/**
 * Exchange an authorization code for an access token, then verify credentials.
 */
export async function exchangeToken(
  serverUrl: string,
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<Account> {
  const url = normalizeServerUrl(serverUrl);
  const oauth = createOAuthAPIClient({ url });

  const token = await oauth.token.create({
    grantType: 'authorization_code',
    clientId,
    clientSecret,
    redirectUri: REDIRECT_URI,
    code,
    scope: SCOPES,
  });

  const rest = createRestAPIClient({ url, accessToken: token.accessToken });
  const me = await rest.v1.accounts.verifyCredentials();

  return {
    serverUrl: url,
    accessToken: token.accessToken,
    username: me.username,
    displayName: me.displayName,
    avatarUrl: me.avatar,
  };
}

function normalizeServerUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  // Remove trailing slash
  return url.replace(/\/+$/, '');
}
