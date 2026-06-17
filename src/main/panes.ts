import { app } from 'electron';
import path from 'node:path';
import type { PaneDefinition, PaneLayout } from '../shared/types.ts';
import { readJsonFile, writeJsonFile } from './jsonStorage.ts';

/** File where pane layout data is stored */
function getPaneLayoutFilePath(): string {
  return path.join(app.getPath('userData'), 'pane-layout.json');
}

function isPaneDefinition(value: unknown): value is PaneDefinition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<PaneDefinition>;
  return (
    typeof candidate.id === 'string' &&
    Array.isArray(candidate.tabIds) &&
    candidate.tabIds.every((tabId) => typeof tabId === 'string') &&
    typeof candidate.activeTabId === 'string' &&
    typeof candidate.widthRatio === 'number' &&
    Number.isFinite(candidate.widthRatio) &&
    candidate.widthRatio > 0
  );
}

function isPaneLayout(value: unknown): value is PaneLayout {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<PaneLayout>;
  return Array.isArray(candidate.panes) && candidate.panes.every(isPaneDefinition);
}

export function loadPaneLayout(): PaneLayout | null {
  return readJsonFile<PaneLayout | null>(
    getPaneLayoutFilePath(),
    null,
    (value): value is PaneLayout | null => isPaneLayout(value),
  );
}

export function savePaneLayout(layout: PaneLayout): void {
  writeJsonFile(getPaneLayoutFilePath(), layout);
}
