import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from '../shared/ipc.ts';
import type {
  Account,
  AppSettings,
  MastoNotification,
  MediaUploadParams,
  NotificationFetchParams,
  OAuthStartLoginResult,
  OAuthExchangeTokenParams,
  PaneLayout,
  StatusActionParams,
  StatusCreateParams,
  UploadedMedia,
  StreamConnectionStatusData,
  StreamEventData,
  StreamSubscribeParams,
  TabDefinition,
  TimelineFetchParams,
  Post,
} from '../shared/types.ts';

const api = {
  /** Start OAuth login: register app and get authorization URL */
  startLogin(serverUrl: string): Promise<OAuthStartLoginResult> {
    return ipcRenderer.invoke(IpcChannels.OAuthStartLogin, serverUrl);
  },
  /** Exchange authorization code for access token and save account */
  exchangeToken(params: OAuthExchangeTokenParams): Promise<Account> {
    return ipcRenderer.invoke(IpcChannels.OAuthExchangeToken, params);
  },
  /** Get the list of saved accounts */
  listAccounts(): Promise<Account[]> {
    return ipcRenderer.invoke(IpcChannels.AccountsList);
  },
  /** Remove a saved account */
  removeAccount(serverUrl: string, username: string): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.AccountsRemove, serverUrl, username);
  },
  /** Fetch timeline posts */
  fetchTimeline(params: TimelineFetchParams): Promise<Post[]> {
    return ipcRenderer.invoke(IpcChannels.TimelineFetch, params);
  },
  /** Fetch notifications */
  fetchNotifications(params: NotificationFetchParams): Promise<MastoNotification[]> {
    return ipcRenderer.invoke(IpcChannels.NotificationsFetch, params);
  },
  /** Create a new status */
  createStatus(params: StatusCreateParams): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.StatusesCreate, params);
  },
  /** Upload media for status posting */
  uploadMedia(params: MediaUploadParams): Promise<UploadedMedia> {
    return ipcRenderer.invoke(IpcChannels.MediaUpload, params);
  },
  /** Get the list of saved tabs */
  listTabs(): Promise<TabDefinition[]> {
    return ipcRenderer.invoke(IpcChannels.TabsList);
  },
  /** Save the current tabs */
  saveTabs(tabs: TabDefinition[]): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.TabsSave, tabs);
  },
  /** Subscribe to a streaming channel */
  subscribeStream(params: StreamSubscribeParams): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.StreamSubscribe, params);
  },
  /** Unsubscribe from a streaming channel */
  unsubscribeStream(subscriptionId: string): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.StreamUnsubscribe, subscriptionId);
  },
  /** Favourite a status */
  favouriteStatus(params: StatusActionParams): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.StatusFavourite, params);
  },
  /** Unfavourite a status */
  unfavouriteStatus(params: StatusActionParams): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.StatusUnfavourite, params);
  },
  /** Reblog a status */
  reblogStatus(params: StatusActionParams): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.StatusReblog, params);
  },
  /** Unreblog a status */
  unreblogStatus(params: StatusActionParams): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.StatusUnreblog, params);
  },
  /** Bookmark a status */
  bookmarkStatus(params: StatusActionParams): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.StatusBookmark, params);
  },
  /** Unbookmark a status */
  unbookmarkStatus(params: StatusActionParams): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.StatusUnbookmark, params);
  },
  /** Load application settings */
  loadSettings(): Promise<AppSettings> {
    return ipcRenderer.invoke(IpcChannels.SettingsLoad);
  },
  /** Save application settings */
  saveSettings(settings: AppSettings): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.SettingsSave, settings);
  },
  /** Load pane layout */
  loadPaneLayout(): Promise<PaneLayout | null> {
    return ipcRenderer.invoke(IpcChannels.PaneLayoutLoad);
  },
  /** Save pane layout */
  savePaneLayout(layout: PaneLayout): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.PaneLayoutSave, layout);
  },
  /** Listen for streaming events */
  onStreamEvent(callback: (event: StreamEventData) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, data: StreamEventData): void => {
      callback(data);
    };
    ipcRenderer.on(IpcChannels.StreamEvent, listener);
    return () => {
      ipcRenderer.removeListener(IpcChannels.StreamEvent, listener);
    };
  },
  /** Listen for stream connection status changes */
  onStreamConnectionStatus(callback: (data: StreamConnectionStatusData) => void): () => void {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: StreamConnectionStatusData,
    ): void => {
      callback(data);
    };
    ipcRenderer.on(IpcChannels.StreamConnectionStatus, listener);
    return () => {
      ipcRenderer.removeListener(IpcChannels.StreamConnectionStatus, listener);
    };
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ApiType = typeof api;
