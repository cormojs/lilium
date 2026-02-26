import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { IpcChannels } from '../shared/ipc.ts';
import type {
  AppSettings,
  NotificationFetchParams,
  OAuthExchangeTokenParams,
  StatusActionParams,
  StatusCreateParams,
  StreamSubscribeParams,
  TabDefinition,
  TimelineFetchParams,
} from '../shared/types.ts';
import { startLogin, exchangeToken } from './oauth.ts';
import { listAccounts, addAccount, removeAccount } from './accounts.ts';
import { fetchTimeline } from './timeline.ts';
import { fetchNotifications } from './notifications.ts';
import { listTabs, saveTabs } from './tabs.ts';
import { loadSettings, saveSettings } from './settings.ts';
import { subscribeStream, unsubscribeStream, unsubscribeAllStreams } from './streaming.ts';
import {
  createStatus,
  favouriteStatus,
  unfavouriteStatus,
  reblogStatus,
  unreblogStatus,
  bookmarkStatus,
  unbookmarkStatus,
} from './statuses.ts';
import { createMainWindowOptions, restoreMaximizeState, saveWindowState } from './windowState.ts';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    ...createMainWindowOptions(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  restoreMaximizeState(mainWindow);
  mainWindow.on('close', () => {
    saveWindowState(mainWindow);
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.OAuthStartLogin, async (_event, serverUrl: string) => {
    return startLogin(serverUrl);
  });

  ipcMain.handle(
    IpcChannels.OAuthExchangeToken,
    async (_event, params: OAuthExchangeTokenParams) => {
      const account = await exchangeToken(
        params.serverUrl,
        params.clientId,
        params.clientSecret,
        params.code,
      );
      addAccount(account);
      return account;
    },
  );

  ipcMain.handle(IpcChannels.AccountsList, async () => {
    return listAccounts();
  });

  ipcMain.handle(
    IpcChannels.AccountsRemove,
    async (_event, serverUrl: string, username: string) => {
      removeAccount(serverUrl, username);
    },
  );

  ipcMain.handle(IpcChannels.TimelineFetch, async (_event, params: TimelineFetchParams) => {
    return fetchTimeline(params.serverUrl, params.accessToken, params.type, params.maxId);
  });

  ipcMain.handle(
    IpcChannels.NotificationsFetch,
    async (_event, params: NotificationFetchParams) => {
      return fetchNotifications(params.serverUrl, params.accessToken, params.maxId);
    },
  );

  ipcMain.handle(IpcChannels.TabsList, async () => {
    return listTabs();
  });

  ipcMain.handle(IpcChannels.TabsSave, async (_event, tabs: TabDefinition[]) => {
    saveTabs(tabs);
  });

  ipcMain.handle(IpcChannels.StatusesCreate, async (_event, params: StatusCreateParams) => {
    await createStatus(params.serverUrl, params.accessToken, params.status, params.visibility);
  });

  ipcMain.handle(IpcChannels.StatusFavourite, async (_event, params: StatusActionParams) => {
    await favouriteStatus(params.serverUrl, params.accessToken, params.statusId);
  });

  ipcMain.handle(IpcChannels.StatusUnfavourite, async (_event, params: StatusActionParams) => {
    await unfavouriteStatus(params.serverUrl, params.accessToken, params.statusId);
  });

  ipcMain.handle(IpcChannels.StatusReblog, async (_event, params: StatusActionParams) => {
    await reblogStatus(params.serverUrl, params.accessToken, params.statusId);
  });

  ipcMain.handle(IpcChannels.StatusUnreblog, async (_event, params: StatusActionParams) => {
    await unreblogStatus(params.serverUrl, params.accessToken, params.statusId);
  });

  ipcMain.handle(IpcChannels.StatusBookmark, async (_event, params: StatusActionParams) => {
    await bookmarkStatus(params.serverUrl, params.accessToken, params.statusId);
  });

  ipcMain.handle(IpcChannels.StatusUnbookmark, async (_event, params: StatusActionParams) => {
    await unbookmarkStatus(params.serverUrl, params.accessToken, params.statusId);
  });

  ipcMain.handle(IpcChannels.StreamSubscribe, async (event, params: StreamSubscribeParams) => {
    await subscribeStream(params, event.sender);
  });

  ipcMain.handle(IpcChannels.StreamUnsubscribe, async (_event, subscriptionId: string) => {
    unsubscribeStream(subscriptionId);
  });

  ipcMain.handle(IpcChannels.SettingsLoad, async () => {
    return loadSettings();
  });

  ipcMain.handle(IpcChannels.SettingsSave, async (_event, settings: AppSettings) => {
    saveSettings(settings);
  });
}

app.commandLine.appendSwitch('disable-gpu-sandbox');

app.whenReady().then(() => {
  registerIpcHandlers();
  console.log('Registered IPC handlers');
  createWindow();
  console.log('App is ready');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  unsubscribeAllStreams();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
