import { app } from 'electron';
import path from 'node:path';
import type { TabDefinition, TimelineType } from '../shared/types.ts';
import { readJsonFile, writeJsonFile } from './jsonStorage.ts';

/** File where tab data is stored */
function getTabsFilePath(): string {
  return path.join(app.getPath('userData'), 'tabs.json');
}

function isTimelineType(value: unknown): value is TimelineType {
  return (
    value === 'home' ||
    value === 'public' ||
    value === 'local' ||
    value === 'favourites' ||
    value === 'notifications' ||
    value === 'account'
  );
}

function isTabDefinition(value: unknown): value is TabDefinition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<TabDefinition>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.accountServerUrl === 'string' &&
    typeof candidate.accountUsername === 'string' &&
    isTimelineType(candidate.timelineType) &&
    (candidate.targetAccountId === undefined || typeof candidate.targetAccountId === 'string') &&
    (candidate.targetAccountAcct === undefined ||
      typeof candidate.targetAccountAcct === 'string') &&
    (candidate.customName === undefined || typeof candidate.customName === 'string')
  );
}

function isTabDefinitionList(value: unknown): value is TabDefinition[] {
  return Array.isArray(value) && value.every(isTabDefinition);
}

export function listTabs(): TabDefinition[] {
  return readJsonFile(getTabsFilePath(), [], isTabDefinitionList);
}

export function saveTabs(tabs: TabDefinition[]): void {
  writeJsonFile(getTabsFilePath(), tabs);
}
