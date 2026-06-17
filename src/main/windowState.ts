import { app, type BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import path from 'node:path';
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

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidWindowState(value: unknown): value is WindowState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<WindowState>;
  if (!isNumber(candidate.width) || !isNumber(candidate.height)) {
    return false;
  }

  if (candidate.width <= 0 || candidate.height <= 0) {
    return false;
  }

  if (candidate.x !== undefined && !isNumber(candidate.x)) {
    return false;
  }

  if (candidate.y !== undefined && !isNumber(candidate.y)) {
    return false;
  }

  return typeof candidate.isMaximized === 'boolean';
}

function readWindowState(): WindowState | null {
  return readJsonFile<WindowState | null>(
    getWindowStateFilePath(),
    null,
    (value): value is WindowState | null => isValidWindowState(value),
  );
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
