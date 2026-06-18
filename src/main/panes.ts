import { app } from 'electron';
import path from 'node:path';
import { z } from 'zod';
import type { PaneLayout } from '../shared/types.ts';
import { readJsonFile, writeJsonFile } from './jsonStorage.ts';

/** File where pane layout data is stored */
function getPaneLayoutFilePath(): string {
  return path.join(app.getPath('userData'), 'pane-layout.json');
}

const paneDefinitionSchema = z.object({
  id: z.string(),
  tabIds: z.array(z.string()),
  activeTabId: z.string(),
  widthRatio: z.number().positive(),
});

const paneLayoutSchema: z.ZodType<PaneLayout> = z.object({
  panes: z.array(paneDefinitionSchema),
});

export function loadPaneLayout(): PaneLayout | null {
  return readJsonFile(getPaneLayoutFilePath(), paneLayoutSchema.nullable(), null);
}

export function savePaneLayout(layout: PaneLayout): void {
  writeJsonFile(getPaneLayoutFilePath(), layout);
}
