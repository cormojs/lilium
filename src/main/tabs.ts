import path from 'node:path';
import { app } from 'electron';
import { z } from 'zod';
import { savedTabDefinitionSchema, tabDefinitionSchema } from '../shared/tabDefinition.ts';
import type { TabDefinition } from '../shared/types.ts';
import { readJsonFile, writeJsonFile } from './jsonStorage.ts';

/** File where tab data is stored */
function getTabsFilePath(): string {
  return path.join(app.getPath('userData'), 'tabs.json');
}

const tabDefinitionListSchema = z.array(savedTabDefinitionSchema);

export function listTabs(): TabDefinition[] {
  return readJsonFile(getTabsFilePath(), tabDefinitionListSchema, []);
}

export function saveTabs(tabs: TabDefinition[]): void {
  writeJsonFile(getTabsFilePath(), z.array(tabDefinitionSchema).parse(tabs));
}
