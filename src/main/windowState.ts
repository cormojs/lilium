import { app, type BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import path from 'node:path';
import { z } from 'zod';
import { readJsonFile, writeJsonFile } from './jsonStorage.ts';

const DEFAULT_WINDOW_SIZE = {
  width: 900,
  height: 670,
};

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

function getWindowStateFilePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

const windowStateSchema: z.ZodType<WindowState> = z.object({
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  isMaximized: z.boolean(),
});

function readWindowState(): WindowState | null {
  return readJsonFile(getWindowStateFilePath(), windowStateSchema.nullable(), null);
}

export function createMainWindowOptions(): BrowserWindowConstructorOptions {
  const state = readWindowState();

  return {
    width: state?.width ?? DEFAULT_WINDOW_SIZE.width,
    height: state?.height ?? DEFAULT_WINDOW_SIZE.height,
    x: state?.x,
    y: state?.y,
    show: true,
    autoHideMenuBar: true,
  };
}

export function restoreMaximizeState(mainWindow: BrowserWindow): void {
  if (readWindowState()?.isMaximized) {
    mainWindow.maximize();
  }
}

export function saveWindowState(mainWindow: BrowserWindow): void {
  const isMaximized = mainWindow.isMaximized();
  const bounds = isMaximized ? mainWindow.getNormalBounds() : mainWindow.getBounds();

  const state: WindowState = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized,
  };

  writeJsonFile(getWindowStateFilePath(), state);
}
