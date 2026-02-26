import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { PaneLayout } from '../shared/types.ts';

/** File where pane layout data is stored */
function getPaneLayoutFilePath(): string {
  return path.join(app.getPath('userData'), 'pane-layout.json');
}

export function loadPaneLayout(): PaneLayout | null {
  const filePath = getPaneLayoutFilePath();
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as PaneLayout;
}

export function savePaneLayout(layout: PaneLayout): void {
  const filePath = getPaneLayoutFilePath();
  fs.writeFileSync(filePath, JSON.stringify(layout, null, 2), 'utf-8');
}
