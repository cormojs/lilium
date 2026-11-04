import { expect, test } from 'bun:test';
import type { Post } from '../types.ts';
import { compileQuery, evaluateQuery } from './evaluator.ts';
import { appendQueryPage, updateQueryPage } from './timeline.ts';

function post(id: string, content = '', media = false): Post {
  return {
    id,
    content,
    spoilerText: '',
    sensitive: false,
    createdAt: '',
    url: null,
    account: { id: '1', acct: 'alice@example.com', displayName: '', avatarUrl: '', emojis: [] },
    mediaAttachments: media
      ? [{ id: '1', type: 'image', url: '', previewUrl: '', description: null }]
      : [],
    visibility: 'public',
    favourited: false,
    reblogged: false,
    bookmarked: false,
    emojis: [],
    inReplyToId: null,
  };
}

test('example merges sources, filters with OR/NOT, deduplicates, and sorts decimal IDs', () => {
  const query = compileQuery(
    '(from (merge (tl :local) (tl :public)) :where (or (contains .txt "hogehoge") (not (null? .media))) :order (sort .id))',
  );
  expect(query.sources).toEqual(['local', 'public']);
  const items = [
    post('9007199254740993', 'hogehoge'),
    post('10', '', true),
    post('9', 'skip'),
    post('10', '', true),
    post('9007199254740992', 'hogehoge'),
  ];
  expect(evaluateQuery(query, items).map((item) => item.id)).toEqual([
    '10',
    '9007199254740992',
    '9007199254740993',
  ]);
  expect(items).toHaveLength(5);
});

test('text search decodes entities and excludes markup attributes', () => {
  const query = compileQuery('(from (tl :home) :where (contains .txt "猫 & 犬"))');
  expect(query.matches(post('1', '<p>猫 &amp; <b>犬</b></p>'))).toBe(true);
  expect(query.matches(post('2', '<a title="猫 &amp; 犬">other</a>'))).toBe(false);
});

test('AND predicates and explicit descending order', () => {
  const query = compileQuery(
    '(from (tl :home) :where (and (contains .acct "alice") (null? .media)) :order (sort .id :desc))',
  );
  expect(
    evaluateQuery(query, [post('2'), post('10'), post('11', '', true)]).map((item) => item.id),
  ).toEqual(['10', '2']);
});

test('default order is newest first and repeated sources are fetched once', () => {
  const query = compileQuery('(from (merge (tl :home) (tl :home)))');
  expect(query.sources).toEqual(['home']);
  expect(evaluateQuery(query, [post('2'), post('10')]).map((item) => item.id)).toEqual(['10', '2']);
});

test.each([
  '(from)',
  '(from (tl :unknown))',
  '(from (tl :home) :where)',
  '(from (tl :home) :where (exec "evil"))',
  '(from (tl :home) :where (contains .missing "x"))',
  '(from (tl :home) :where (contains .media "x"))',
  '(from (tl :home) :where (not))',
  '(from (tl :home) :where (or (null? .media)))',
  '(from (tl :home) :limit "10")',
  '(from (tl :home) :order (sort .id :bad))',
  '(from (tl :home) :order (sort .txt))',
  '(from (tl :home) :where (null? .media) :where (null? .media))',
])('rejects invalid semantics before fetching: %s', (source) => {
  expect(() => compileQuery(source)).toThrow();
});

test('pagination uses the unfiltered source cursor, despite empty results or sorting', () => {
  const page = appendQueryPage(undefined, [post('10'), post('9')]);
  expect(
    evaluateQuery(compileQuery('(from (tl :home) :where (contains .txt "absent"))'), page.posts),
  ).toEqual([]);
  expect(page.cursor).toBe('9');
  expect(page.exhausted).toBe(false);
  const next = appendQueryPage(page, [post('8', 'absent'), post('7')]);
  expect(next.cursor).toBe('7');
  expect(next.posts).toHaveLength(4);
  expect(appendQueryPage(next, []).exhausted).toBe(true);
  expect(appendQueryPage(next, [post('7')]).exhausted).toBe(true);
});

test('stream updates replace matching IDs and preserve page cursors', () => {
  const page = appendQueryPage(undefined, [post('10', 'old'), post('9')]);
  const updated = updateQueryPage(page, post('10', 'new'));
  expect(updated.posts).toHaveLength(2);
  expect(updated.posts[0]?.content).toBe('new');
  expect(updated.cursor).toBe('9');
});

test('stream trimming permits fetching discarded history again', () => {
  const page = appendQueryPage(
    undefined,
    Array.from({ length: 400 }, (_, i) => post(String(400 - i))),
  );
  const updated = updateQueryPage({ ...page, exhausted: true }, post('401'));
  expect(updated.posts).toHaveLength(400);
  expect(updated.cursor).toBe('2');
  expect(updated.exhausted).toBe(false);
});
