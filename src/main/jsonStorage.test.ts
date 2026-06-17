import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJsonFile, writeJsonFile } from './jsonStorage.ts';

function withTempDir(run: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lilium-json-storage-'));
  try {
    run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('jsonStorage', () => {
  test('returns fallback when a file is missing or malformed', () => {
    withTempDir((dir) => {
      const filePath = path.join(dir, 'settings.json');
      expect(readJsonFile(filePath, { enabled: false })).toEqual({ enabled: false });

      fs.writeFileSync(filePath, '{broken json', 'utf-8');
      expect(readJsonFile(filePath, { enabled: false })).toEqual({ enabled: false });
    });
  });

  test('returns fallback when parsed data fails validation', () => {
    withTempDir((dir) => {
      const filePath = path.join(dir, 'tabs.json');
      fs.writeFileSync(filePath, '{"items":null}', 'utf-8');

      const result = readJsonFile<string[]>(
        filePath,
        [],
        (value): value is string[] =>
          Array.isArray(value) && value.every((item) => typeof item === 'string'),
      );

      expect(result).toEqual([]);
    });
  });

  test('writes readable JSON', () => {
    withTempDir((dir) => {
      const filePath = path.join(dir, 'accounts.json');
      writeJsonFile(filePath, [{ username: 'alice' }]);

      expect(readJsonFile(filePath, [])).toEqual([{ username: 'alice' }]);
      expect(fs.existsSync(`${filePath}.tmp`)).toBe(false);
    });
  });
});
