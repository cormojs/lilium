import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { AppSettings } from '../shared/types.ts';

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

export function loadSettings(): AppSettings {
  const filePath = getSettingsFilePath();
  if (!fs.existsSync(filePath)) {
    return { ...DEFAULT_SETTINGS };
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  const saved = JSON.parse(data) as Partial<AppSettings>;
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(settings: AppSettings): void {
  const filePath = getSettingsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
}
