import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from '../shared/ipc.ts';
import type {
  Account,
  MastoNotification,
  NotificationFetchParams,
  OAuthStartLoginResult,
  OAuthExchangeTokenParams,
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
  /** Get the list of saved tabs */
  listTabs(): Promise<TabDefinition[]> {
    return ipcRenderer.invoke(IpcChannels.TabsList);
  },
  /** Save the current tabs */
  saveTabs(tabs: TabDefinition[]): Promise<void> {
    return ipcRenderer.invoke(IpcChannels.TabsSave, tabs);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ApiType = typeof api;
