/** IPC channel names — shared between main and renderer processes */
export const IpcChannels = {
  /** Register an OAuth app on a Mastodon server */
  OAuthStartLogin: 'oauth:start-login',
  /** Exchange an authorization code for an access token */
  OAuthExchangeToken: 'oauth:exchange-token',
  /** Get the list of saved accounts */
  AccountsList: 'accounts:list',
  /** Remove a saved account */
  AccountsRemove: 'accounts:remove',
} as const;
