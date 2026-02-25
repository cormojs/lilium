import type { ApiType } from '../preload/index.ts';

declare global {
  interface Window {
    api: ApiType;
  }
}
