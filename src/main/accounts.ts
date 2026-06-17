import { app, safeStorage } from 'electron';
import path from 'node:path';
import type { Account } from '../shared/types.ts';
import { readJsonFile, writeJsonFile } from './jsonStorage.ts';

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

export interface AccountCredentials extends Account {
  accessToken: string;
}

function isStoredAccount(value: unknown): value is StoredAccount {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<StoredAccount>;
  return (
    typeof candidate.serverUrl === 'string' &&
    typeof candidate.encryptedToken === 'string' &&
    typeof candidate.username === 'string' &&
    typeof candidate.displayName === 'string' &&
    typeof candidate.avatarUrl === 'string'
  );
}

function isStoredAccountList(value: unknown): value is StoredAccount[] {
  return Array.isArray(value) && value.every(isStoredAccount);
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
  return readJsonFile(getAccountsFilePath(), [], isStoredAccountList);
}

function writeStoredAccounts(accounts: StoredAccount[]): void {
  writeJsonFile(getAccountsFilePath(), accounts);
}

export function listAccounts(): Account[] {
  return readStoredAccounts().map((stored) => ({
    serverUrl: stored.serverUrl,
    username: stored.username,
    displayName: stored.displayName,
    avatarUrl: stored.avatarUrl,
  }));
}

export function getAccountCredentials(serverUrl: string, username: string): AccountCredentials {
  const stored = readStoredAccounts().find(
    (account) => account.serverUrl === serverUrl && account.username === username,
  );
  if (!stored) {
    throw new Error('指定されたアカウントが見つかりません');
  }
  return {
    serverUrl: stored.serverUrl,
    accessToken: decryptToken(stored.encryptedToken),
    username: stored.username,
    displayName: stored.displayName,
    avatarUrl: stored.avatarUrl,
  };
}

export function addAccount(account: AccountCredentials): void {
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
