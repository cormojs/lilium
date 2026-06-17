import fs from 'node:fs';
import { z } from 'zod';

const { parse: parseJsonText } = JSON;

const jsonTextSchema = z.string().transform((content, context): unknown => {
  try {
    const parsed: unknown = parseJsonText(content);
    return parsed;
  } catch {
    context.addIssue({
      code: 'custom',
      message: 'Invalid JSON',
    });
    return z.NEVER;
  }
});

export function readJsonFile<T>(filePath: string, schema: z.ZodType<T>, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return fallback;
  }

  const parsed = jsonTextSchema.safeParse(content);
  if (!parsed.success) {
    return fallback;
  }

  const result = schema.safeParse(parsed.data);
  return result.success ? result.data : fallback;
}

export function writeJsonFile(filePath: string, value: unknown): void {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}
