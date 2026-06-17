import { app } from 'electron';
import path from 'node:path';
import type { AppSettings } from '../shared/types.ts';
import { readJsonFile, writeJsonFile } from './jsonStorage.ts';

export const DEFAULT_SETTINGS: AppSettings = {
  avatarSize: 48,
  boostAvatarSize: 25,
  postFontSize: 14,
  uiFontSize: 14,
  compactFontSize: 12,
  disableCompactDisplay: false,
  mastodonLikeExpandedDisplay: false,
};

function getSettingsFilePath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

function isPartialAppSettings(value: unknown): value is Partial<AppSettings> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<Record<keyof AppSettings, unknown>>;
  const isOptionalNumber = (setting: unknown): boolean =>
    setting === undefined || (typeof setting === 'number' && Number.isFinite(setting));
  return (
    isOptionalNumber(candidate.avatarSize) &&
    isOptionalNumber(candidate.boostAvatarSize) &&
    isOptionalNumber(candidate.postFontSize) &&
    isOptionalNumber(candidate.uiFontSize) &&
    isOptionalNumber(candidate.compactFontSize) &&
    (candidate.disableCompactDisplay === undefined ||
      typeof candidate.disableCompactDisplay === 'boolean') &&
    (candidate.mastodonLikeExpandedDisplay === undefined ||
      typeof candidate.mastodonLikeExpandedDisplay === 'boolean')
  );
}

export function loadSettings(): AppSettings {
  const saved = readJsonFile<Partial<AppSettings>>(getSettingsFilePath(), {}, isPartialAppSettings);
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(settings: AppSettings): void {
  writeJsonFile(getSettingsFilePath(), settings);
}
