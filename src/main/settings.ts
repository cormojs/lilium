import { app } from 'electron';
import path from 'node:path';
import { z } from 'zod';
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

const partialAppSettingsSchema: z.ZodType<Partial<AppSettings>> = z
  .object({
    avatarSize: z.number().finite(),
    boostAvatarSize: z.number().finite(),
    postFontSize: z.number().finite(),
    uiFontSize: z.number().finite(),
    compactFontSize: z.number().finite(),
    disableCompactDisplay: z.boolean(),
    mastodonLikeExpandedDisplay: z.boolean(),
  })
  .partial();

export function loadSettings(): AppSettings {
  const saved = readJsonFile(getSettingsFilePath(), partialAppSettingsSchema, {});
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(settings: AppSettings): void {
  writeJsonFile(getSettingsFilePath(), settings);
}
