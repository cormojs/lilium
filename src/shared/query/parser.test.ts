import { describe, expect, test } from 'bun:test';
import { parseQuery, tokenizeQuery } from './parser.ts';

export const EXAMPLE = `(from (merge (tl :local) (tl :public))
  :where (or (contains .txt "hogehoge")
             (not (null? .media)))
  :order (sort .id))`;

describe('query syntax', () => {
  test('produces the AST specified in Issue #2', () => {
    expect(parseQuery(EXAMPLE)).toEqual({
      type: 'Call',
      name: 'from',
      args: [
        {
          type: 'Call',
          name: 'merge',
          args: [
            { type: 'Call', name: 'tl', args: [{ type: 'Keyword', value: 'local' }] },
            { type: 'Call', name: 'tl', args: [{ type: 'Keyword', value: 'public' }] },
          ],
        },
        { type: 'Keyword', value: 'where' },
        {
          type: 'Call',
          name: 'or',
          args: [
            {
              type: 'Call',
              name: 'contains',
              args: [
                { type: 'Field', value: 'txt' },
                { type: 'String', value: 'hogehoge' },
              ],
            },
            {
              type: 'Call',
              name: 'not',
              args: [{ type: 'Call', name: 'null?', args: [{ type: 'Field', value: 'media' }] }],
            },
          ],
        },
        { type: 'Keyword', value: 'order' },
        { type: 'Call', name: 'sort', args: [{ type: 'Field', value: 'id' }] },
      ],
    });
  });
  test('strings preserve Japanese, parentheses, and escaped characters', () => {
    expect(tokenizeQuery('"猫 () \\" \\\\ \\n\\t"')).toEqual([
      { type: 'string', value: '猫 () " \\ \n\t', position: 0 },
    ]);
  });
  test.each([
    '',
    '()',
    '(tl :home',
    '(tl :home))',
    '(tl :home) (tl :local)',
    '("tl" :home)',
    '(tl :)',
    '(f .)',
    '(f "unterminated)',
    '(f "\\q")',
    'bare',
  ])('rejects invalid syntax: %s', (source) => {
    expect(() => parseQuery(source)).toThrow();
  });
  test('bounds input length and nesting', () => {
    expect(() => parseQuery(' '.repeat(10001))).toThrow();
    expect(() => parseQuery('(f '.repeat(66) + '"x"' + ')'.repeat(66))).toThrow();
  });
});
