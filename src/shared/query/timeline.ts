import type { Post } from '../types.ts';
import { comparePostIds, type QuerySource } from './evaluator.ts';

export interface QueryPage {
  posts: Post[];
  cursor?: string;
  exhausted: boolean;
}

/** Cursors belong to each unfiltered source, never to the sorted display. */
export function appendQueryPage(previous: QueryPage | undefined, posts: Post[]): QueryPage {
  const cursor = posts.at(-1)?.id ?? previous?.cursor;
  return {
    posts: [
      ...new Map([...(previous?.posts ?? []), ...posts].map((post) => [post.id, post])).values(),
    ],
    cursor,
    exhausted: posts.length === 0 || (previous?.cursor !== undefined && previous.cursor === cursor),
  };
}

export function updateQueryPage(page: QueryPage, post: Post): QueryPage {
  const posts = new Map(page.posts.map((item) => [item.id, item]));
  posts.set(post.id, post);
  const retained = [...posts.values()].sort((a, b) => comparePostIds(b.id, a.id)).slice(0, 400);
  const trimmed = posts.size > retained.length;
  return {
    ...page,
    posts: retained,
    cursor: trimmed ? retained.at(-1)?.id : page.cursor,
    exhausted: trimmed ? false : page.exhausted,
  };
}

export function querySubscriptionId(tabId: string, source: QuerySource): string {
  return `query-${tabId}-${source}`;
}
