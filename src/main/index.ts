import { app, BrowserWindow, ipcMain, nativeImage, Notification, shell } from 'electron';
import path from 'node:path';
import { IpcChannels } from '../shared/ipc.ts';
import type {
  Account,
  AppSettings,
  AccountProfileFetchParams,
  AccountRelationshipParams,
  AccountSuggestionsFetchParams,
  NotificationFetchParams,
  OAuthExchangeTokenParams,
  PaneLayout,
  PollRefreshParams,
  PollVoteParams,
  StatusActionParams,
  MediaUploadParams,
  ShowNotificationParams,
  StatusCreateParams,
  StreamSubscribeParams,
  TabDefinition,
  TimelineFetchParams,
} from '../shared/types.ts';
import { startLogin, exchangeToken } from './oauth.ts';
import { listAccounts, addAccount, removeAccount, getAccountCredentials } from './accounts.ts';
import {
  fetchAccountProfile,
  fetchAccountRelationship,
  fetchAccountSuggestions,
  fetchTimeline,
  followAccount,
  unfollowAccount,
} from './timeline.ts';
import { fetchNotifications } from './notifications.ts';
import { listTabs, saveTabs } from './tabs.ts';
import { loadSettings, saveSettings } from './settings.ts';
import { loadPaneLayout, savePaneLayout } from './panes.ts';
import { subscribeStream, unsubscribeStream, unsubscribeAllStreams } from './streaming.ts';
import {
  createStatus,
  uploadMedia,
  favouriteStatus,
  unfavouriteStatus,
  reblogStatus,
  unreblogStatus,
  bookmarkStatus,
  unbookmarkStatus,
  votePoll,
  refreshPoll,
} from './statuses.ts';
import { createMainWindowOptions, restoreMaximizeState, saveWindowState } from './windowState.ts';
import { rateLimitedCall } from './rateLimiter.ts';

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function toPublicAccount(account: {
  serverUrl: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}): Account {
  return {
    serverUrl: account.serverUrl,
    username: account.username,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
  };
}

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
    if (isHttpUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow.webContents.getURL();
    if (url === currentUrl) {
      return;
    }
    event.preventDefault();
    if (isHttpUrl(url)) {
      void shell.openExternal(url);
    }
  });
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      event.preventDefault();
      mainWindow.webContents.toggleDevTools();
    }
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
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
      return toPublicAccount(account);
    },
  );

  ipcMain.handle(IpcChannels.AccountsList, () => {
    return listAccounts();
  });

  ipcMain.handle(IpcChannels.AccountsRemove, (_event, serverUrl: string, username: string) => {
    removeAccount(serverUrl, username);
  });

  ipcMain.handle(IpcChannels.TimelineFetch, async (_event, params: TimelineFetchParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    return rateLimitedCall(() =>
      fetchTimeline(
        account.serverUrl,
        account.accessToken,
        params.type,
        params.accountId,
        params.maxId,
      ),
    );
  });

  ipcMain.handle(
    IpcChannels.AccountProfileFetch,
    async (_event, params: AccountProfileFetchParams) => {
      const account = getAccountCredentials(params.serverUrl, params.username);
      return rateLimitedCall(() =>
        fetchAccountProfile(account.serverUrl, account.accessToken, params.accountId),
      );
    },
  );

  ipcMain.handle(
    IpcChannels.AccountRelationshipFetch,
    async (_event, params: AccountRelationshipParams) => {
      const account = getAccountCredentials(params.serverUrl, params.username);
      return rateLimitedCall(() =>
        fetchAccountRelationship(account.serverUrl, account.accessToken, params.accountId),
      );
    },
  );

  ipcMain.handle(
    IpcChannels.AccountSuggestionsFetch,
    async (_event, params: AccountSuggestionsFetchParams) => {
      const account = getAccountCredentials(params.serverUrl, params.username);
      return rateLimitedCall(() =>
        fetchAccountSuggestions(account.serverUrl, account.accessToken, params.query),
      );
    },
  );

  ipcMain.handle(IpcChannels.AccountFollow, async (_event, params: AccountRelationshipParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    return rateLimitedCall(() =>
      followAccount(account.serverUrl, account.accessToken, params.accountId),
    );
  });

  ipcMain.handle(IpcChannels.AccountUnfollow, async (_event, params: AccountRelationshipParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    return rateLimitedCall(() =>
      unfollowAccount(account.serverUrl, account.accessToken, params.accountId),
    );
  });

  ipcMain.handle(
    IpcChannels.NotificationsFetch,
    async (_event, params: NotificationFetchParams) => {
      const account = getAccountCredentials(params.serverUrl, params.username);
      return rateLimitedCall(() =>
        fetchNotifications(account.serverUrl, account.accessToken, params.maxId),
      );
    },
  );

  ipcMain.handle(IpcChannels.TabsList, () => {
    return listTabs();
  });

  ipcMain.handle(IpcChannels.TabsSave, (_event, tabs: TabDefinition[]) => {
    saveTabs(tabs);
  });

  ipcMain.handle(IpcChannels.StatusesCreate, async (_event, params: StatusCreateParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    await rateLimitedCall(() =>
      createStatus(
        account.serverUrl,
        account.accessToken,
        params.status,
        params.spoilerText,
        params.visibility,
        params.inReplyToId,
        params.quotedStatusId,
        params.mediaIds,
      ),
    );
  });

  ipcMain.handle(IpcChannels.MediaUpload, async (_event, params: MediaUploadParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    return rateLimitedCall(() =>
      uploadMedia(
        account.serverUrl,
        account.accessToken,
        params.fileName,
        params.mimeType,
        params.data,
      ),
    );
  });

  ipcMain.handle(IpcChannels.StatusFavourite, async (_event, params: StatusActionParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    await rateLimitedCall(() =>
      favouriteStatus(account.serverUrl, account.accessToken, params.statusId),
    );
  });

  ipcMain.handle(IpcChannels.StatusUnfavourite, async (_event, params: StatusActionParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    await rateLimitedCall(() =>
      unfavouriteStatus(account.serverUrl, account.accessToken, params.statusId),
    );
  });

  ipcMain.handle(IpcChannels.StatusReblog, async (_event, params: StatusActionParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    await rateLimitedCall(() =>
      reblogStatus(account.serverUrl, account.accessToken, params.statusId),
    );
  });

  ipcMain.handle(IpcChannels.StatusUnreblog, async (_event, params: StatusActionParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    await rateLimitedCall(() =>
      unreblogStatus(account.serverUrl, account.accessToken, params.statusId),
    );
  });

  ipcMain.handle(IpcChannels.StatusBookmark, async (_event, params: StatusActionParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    await rateLimitedCall(() =>
      bookmarkStatus(account.serverUrl, account.accessToken, params.statusId),
    );
  });

  ipcMain.handle(IpcChannels.StatusUnbookmark, async (_event, params: StatusActionParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    await rateLimitedCall(() =>
      unbookmarkStatus(account.serverUrl, account.accessToken, params.statusId),
    );
  });

  ipcMain.handle(IpcChannels.PollVote, async (_event, params: PollVoteParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    return rateLimitedCall(() =>
      votePoll(account.serverUrl, account.accessToken, params.pollId, params.choices),
    );
  });

  ipcMain.handle(IpcChannels.PollRefresh, async (_event, params: PollRefreshParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    return rateLimitedCall(() =>
      refreshPoll(account.serverUrl, account.accessToken, params.pollId),
    );
  });

  ipcMain.handle(IpcChannels.StreamSubscribe, async (event, params: StreamSubscribeParams) => {
    const account = getAccountCredentials(params.serverUrl, params.username);
    await subscribeStream(params, account.accessToken, event.sender);
  });

  ipcMain.handle(IpcChannels.StreamUnsubscribe, (_event, subscriptionId: string) => {
    unsubscribeStream(subscriptionId);
  });

  ipcMain.handle(IpcChannels.SettingsLoad, () => {
    return loadSettings();
  });

  ipcMain.handle(IpcChannels.SettingsSave, (_event, settings: AppSettings) => {
    saveSettings(settings);
  });

  ipcMain.handle(IpcChannels.PaneLayoutLoad, () => {
    return loadPaneLayout();
  });

  ipcMain.handle(IpcChannels.PaneLayoutSave, (_event, layout: PaneLayout) => {
    savePaneLayout(layout);
  });

  ipcMain.handle(IpcChannels.NotificationShow, async (_event, params: ShowNotificationParams) => {
    if (!Notification.isSupported()) {
      console.log('Notifications are not supported on this platform');
      return;
    }
    let icon: Electron.NativeImage | undefined;
    if (params.iconUrl) {
      try {
        const res = await fetch(params.iconUrl);
        const buffer = Buffer.from(await res.arrayBuffer());
        icon = nativeImage.createFromBuffer(buffer);
      } catch {
        // ignore fetch errors; show notification without icon
      }
    }
    new Notification({ title: params.title, body: params.body, icon }).show();
  });
}

app.commandLine.appendSwitch('disable-gpu-sandbox');

void app.whenReady().then(() => {
  app.setAppUserModelId('com.lilium.app');
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
