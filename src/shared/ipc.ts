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
  /** Fetch timeline posts */
  TimelineFetch: 'timeline:fetch',
  /** Fetch notifications */
  NotificationsFetch: 'notifications:fetch',
  /** Post a new status */
  StatusesCreate: 'statuses:create',
  /** Get the list of saved tabs */
  TabsList: 'tabs:list',
  /** Save the current tabs */
  TabsSave: 'tabs:save',
  /** Subscribe to a streaming channel */
  StreamSubscribe: 'stream:subscribe',
  /** Unsubscribe from a streaming channel */
  StreamUnsubscribe: 'stream:unsubscribe',
  /** Streaming event pushed from main to renderer */
  StreamEvent: 'stream:event',
} as const;
