import { expect, test } from 'bun:test';
import { savedTabDefinitionSchema, tabDefinitionSchema } from './tabDefinition.ts';

const common = {
  id: 'tab-1',
  accountServerUrl: 'https://example.com',
  accountUsername: 'alice',
  customName: '名前',
};

test.each(['home', 'public', 'local', 'favourites', 'notifications'])(
  '%s tabs require no target',
  (timelineType) => {
    const tab = { ...common, timelineType };
    expect(tabDefinitionSchema.parse(tab)).toEqual(tab);
  },
);

test.each([
  { timelineType: 'account', targetAccountId: '42', targetAccountAcct: 'alice@example.com' },
  { timelineType: 'context', targetStatusId: '123' },
  { timelineType: 'hashtag', targetHashtag: '猫' },
  { timelineType: 'query', query: '(from (tl :home))' },
])('retains the fields for $timelineType', (fields) => {
  const tab = { ...common, ...fields };
  expect(tabDefinitionSchema.parse(tab)).toEqual(tab);
});

test.each(['account', 'context', 'hashtag', 'query'])(
  '%s rejects a missing required field',
  (timelineType) => {
    expect(tabDefinitionSchema.safeParse({ ...common, timelineType }).success).toBe(false);
  },
);

test.each([
  { timelineType: 'account', targetAccountId: '' },
  { timelineType: 'account', targetStatusId: '123' },
  { timelineType: 'context', targetStatusId: '' },
  { timelineType: 'hashtag', targetHashtag: '' },
  { timelineType: 'query', query: '' },
  { timelineType: 'query', query: 'x'.repeat(10001) },
  { timelineType: 'unknown' },
])('rejects invalid tab fields: $timelineType', (fields) => {
  expect(tabDefinitionSchema.safeParse({ ...common, ...fields }).success).toBe(false);
});

test('removes fields that do not belong to a tab variant when saving', () => {
  expect(
    tabDefinitionSchema.parse({
      ...common,
      timelineType: 'home',
      targetStatusId: '123',
      query: '(from (tl :home))',
    }),
  ).toEqual({ ...common, timelineType: 'home' });
});

test('migrates the previous home + query representation on read', () => {
  const query = '(from (tl :local))';
  expect(savedTabDefinitionSchema.parse({ ...common, timelineType: 'home', query })).toEqual({
    ...common,
    timelineType: 'query',
    query,
  });
  expect(savedTabDefinitionSchema.parse({ ...common, timelineType: 'home' })).toEqual({
    ...common,
    timelineType: 'home',
  });
});

test('the new query representation round-trips without migration', () => {
  const tab = { ...common, timelineType: 'query', query: '(from (tl :home))' };
  expect(savedTabDefinitionSchema.parse(JSON.parse(JSON.stringify(tab)))).toEqual(tab);
});
