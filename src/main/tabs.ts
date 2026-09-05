import path from 'node:path';
import { app } from 'electron';
import { z } from 'zod';
import type { TabDefinition } from '../shared/types.ts';
import { readJsonFile, writeJsonFile } from './jsonStorage.ts';

/** File where tab data is stored */
function getTabsFilePath(): string {
  return path.join(app.getPath('userData'), 'tabs.json');
}

const tabDefinitionSchema: z.ZodType<TabDefinition> = z.object({
  id: z.string(),
  accountServerUrl: z.string(),
  accountUsername: z.string(),
  timelineType: z.enum([
    'home',
    'public',
    'local',
    'favourites',
    'notifications',
    'account',
    'context',
    'hashtag',
  ]),
  targetAccountId: z.string().optional(),
  targetAccountAcct: z.string().optional(),
  targetStatusId: z.string().optional(),
  targetHashtag: z.string().optional(),
  customName: z.string().optional(),
  query: z.string().max(10000).optional(),
});

const tabDefinitionListSchema = z.array(tabDefinitionSchema);

export function listTabs(): TabDefinition[] {
  return readJsonFile(getTabsFilePath(), tabDefinitionListSchema, []);
}

export function saveTabs(tabs: TabDefinition[]): void {
  writeJsonFile(getTabsFilePath(), tabs);
}
