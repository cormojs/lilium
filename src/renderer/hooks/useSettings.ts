import { createContext, useContext } from 'react';
import type { AppSettings } from '../../shared/types.ts';

export const DEFAULT_SETTINGS: AppSettings = {
  avatarSize: 48,
  boostAvatarSize: 25,
  postFontSize: 14,
  uiFontSize: 14,
};

export interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (settings: AppSettings) => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => {},
});

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
