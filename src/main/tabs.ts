import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { TabDefinition } from '../shared/types.ts';

/** File where tab data is stored */
function getTabsFilePath(): string {
  return path.join(app.getPath('userData'), 'tabs.json');
}

export function listTabs(): TabDefinition[] {
  const filePath = getTabsFilePath();
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as TabDefinition[];
}

export function saveTabs(tabs: TabDefinition[]): void {
  const filePath = getTabsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(tabs, null, 2), 'utf-8');
}
