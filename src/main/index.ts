import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { IpcChannels } from '../shared/ipc.ts';
import type { OAuthExchangeTokenParams } from '../shared/types.ts';
import { startLogin, exchangeToken } from './oauth.ts';
import { listAccounts, addAccount, removeAccount } from './accounts.ts';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
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
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
