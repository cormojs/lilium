import { useCallback, useEffect, useRef, useState } from 'react';
import {
  evaluateQuery,
  QUERY_STREAM_TYPES,
  type CompiledQuery,
  type QuerySource,
} from '../../shared/query/evaluator.ts';
import {
  appendQueryPage,
  querySubscriptionId,
  updateQueryPage,
  type QueryPage,
} from '../../shared/query/timeline.ts';
import type { Post, PostPoll, TabDefinition } from '../../shared/types.ts';

interface QuerySession {
  pages: Map<QuerySource, QueryPage>;
  busy: boolean;
  isDisposed: () => boolean;
}

async function fetchSessionPages(
  session: QuerySession,
  query: CompiledQuery | null,
  serverUrl: string,
  username: string,
  publish: (session: QuerySession) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
): Promise<void> {
  if (!query || session.busy || session.isDisposed()) return;
  session.busy = true;
  setLoading(true);
  setError(null);
  try {
    // Fetch once per source per user action. Empty filtered pages must not trigger an API loop.
    const results = await Promise.allSettled(
      query.sources.map(async (source) => {
        const previous = session.pages.get(source);
        if (previous?.exhausted) return;
        const result = await window.api.fetchTimeline({
          serverUrl,
          username,
          type: source,
          maxId: previous?.cursor,
        });
        if (!session.isDisposed())
          session.pages.set(source, appendQueryPage(session.pages.get(source), result));
      }),
    );
    if (session.isDisposed()) return;
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length > 0)
      setError('一部のタイムラインを取得できませんでした。「さらに取得」で再試行できます。');
    publish(session);
  } catch (error) {
    if (!session.isDisposed()) setError(error instanceof Error ? error.message : String(error));
  } finally {
    session.busy = false;
    if (!session.isDisposed()) setLoading(false);
  }
}

export function useQueryTimeline(tab: TabDefinition, query: CompiledQuery | null) {
  const sessionRef = useRef<QuerySession | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const { id, accountServerUrl: serverUrl, accountUsername: username } = tab;

  const publish = useCallback(
    (session: QuerySession) => {
      if (session.isDisposed() || !query) return;
      setPosts(
        evaluateQuery(
          query,
          [...session.pages.values()].flatMap((page) => page.posts),
        ),
      );
      setHasMore(query.sources.some((source) => !session.pages.get(source)?.exhausted));
    },
    [query],
  );

  const fetchPages = useCallback(
    (session: QuerySession) =>
      fetchSessionPages(session, query, serverUrl, username, publish, setLoading, setError),
    [query, serverUrl, username, publish],
  );

  useEffect(() => {
    let disposed = false;
    const session: QuerySession = { pages: new Map(), busy: false, isDisposed: () => disposed };
    sessionRef.current = session;
    setPosts([]);
    setError(null);
    setHasMore(false);
    setLoading(false);
    if (!query) return;
    const removeListener = window.api.onStreamEvent((event) => {
      const source = query.sources.find(
        (item) => querySubscriptionId(id, item) === event.subscriptionId,
      );
      if (!source || session.isDisposed()) return;
      const page = session.pages.get(source) ?? { posts: [], exhausted: false };
      if (event.event === 'update') {
        session.pages.set(source, updateQueryPage(page, event.payload as Post));
      } else if (event.event === 'delete') {
        for (const [key, current] of session.pages) {
          session.pages.set(key, {
            ...current,
            posts: current.posts.filter((post) => post.id !== event.payload),
          });
        }
      }
      publish(session);
    });
    const subscriptions = query.sources.filter((source) => QUERY_STREAM_TYPES[source] !== null);
    for (const source of subscriptions) {
      const streamType = QUERY_STREAM_TYPES[source];
      if (!streamType) continue;
      void window.api
        .subscribeStream({
          serverUrl,
          username,
          streamType,
          subscriptionId: querySubscriptionId(id, source),
        })
        .catch(() => {
          if (!session.isDisposed())
            setError('リアルタイム更新への接続に失敗しました。再取得で再接続できます。');
        });
    }
    void fetchPages(session);
    return () => {
      disposed = true;
      removeListener();
      for (const source of subscriptions)
        void window.api.unsubscribeStream(querySubscriptionId(id, source));
    };
  }, [query, id, serverUrl, username, publish, fetchPages, revision]);

  const loadMore = useCallback(() => {
    if (sessionRef.current) void fetchPages(sessionRef.current);
  }, [fetchPages]);
  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);
  const updatePoll = useCallback(
    (postId: string, poll: PostPoll) => {
      const session = sessionRef.current;
      if (!session) return;
      for (const [source, page] of session.pages) {
        session.pages.set(source, {
          ...page,
          posts: page.posts.map((post) => (post.id === postId ? { ...post, poll } : post)),
        });
      }
      publish(session);
    },
    [publish],
  );
  return { posts, loading, hasMore, error, loadMore, refresh, updatePoll };
}
