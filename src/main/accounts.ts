import { app, safeStorage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { Account } from '../shared/types.ts';

/** File where encrypted account data is stored */
function getAccountsFilePath(): string {
  return path.join(app.getPath('userData'), 'accounts.json');
}

/** Encrypted on-disk format */
interface StoredAccount {
  serverUrl: string;
  /** Base64-encoded encrypted access token */
  encryptedToken: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

function encryptToken(token: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(token).toString('base64');
  }
  // Fallback: store as-is (development / unsupported platforms)
  return Buffer.from(token).toString('base64');
}

function decryptToken(encrypted: string): string {
  const buf = Buffer.from(encrypted, 'base64');
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(buf);
  }
  return buf.toString();
}

function readStoredAccounts(): StoredAccount[] {
  const filePath = getAccountsFilePath();
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as StoredAccount[];
}

function writeStoredAccounts(accounts: StoredAccount[]): void {
  const filePath = getAccountsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2), 'utf-8');
}

export function listAccounts(): Account[] {
  return readStoredAccounts().map((stored) => ({
    serverUrl: stored.serverUrl,
    accessToken: decryptToken(stored.encryptedToken),
    username: stored.username,
    displayName: stored.displayName,
    avatarUrl: stored.avatarUrl,
  }));
}

export function addAccount(account: Account): void {
  const stored = readStoredAccounts();
  // Replace existing account for same server+username
  const idx = stored.findIndex(
    (a) => a.serverUrl === account.serverUrl && a.username === account.username,
  );
  const entry: StoredAccount = {
    serverUrl: account.serverUrl,
    encryptedToken: encryptToken(account.accessToken),
    username: account.username,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
  };
  if (idx >= 0) {
    stored[idx] = entry;
  } else {
    stored.push(entry);
  }
  writeStoredAccounts(stored);
}

export function removeAccount(serverUrl: string, username: string): void {
  const stored = readStoredAccounts();
  const filtered = stored.filter((a) => !(a.serverUrl === serverUrl && a.username === username));
  writeStoredAccounts(filtered);
}
