import { Alert, Button, Flex, Input, Typography } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { compileQuery } from '../../shared/query/evaluator.ts';
import type { Account, Post, TabDefinition } from '../../shared/types.ts';
import { useQueryTimeline } from '../hooks/useQueryTimeline.ts';
import { useSettings } from '../hooks/useSettings.ts';
import { CompactPostItem } from './CompactPostItem.tsx';
import { PostItem } from './PostItem.tsx';
import { VirtualizedPostList } from './VirtualizedPostList.tsx';

interface QueryTabContentProps {
  tab: TabDefinition;
  accounts: Account[];
  onSaveQuery: (tabId: string, query: string) => Promise<void>;
  onReply: (tab: TabDefinition, post: Post) => void;
  onQuote: (tab: TabDefinition, post: Post) => void;
  onOpenAccountTimeline: (tab: TabDefinition, target: { id: string; acct: string }) => void;
  onOpenHashtagTimeline: (tab: TabDefinition, hashtag: string) => void;
  onOpenReplyTree: (tab: TabDefinition, post: Post) => void;
}

export function QueryTabContent({
  tab,
  accounts,
  onSaveQuery,
  onReply,
  onQuote,
  onOpenAccountTimeline,
  onOpenHashtagTimeline,
  onOpenReplyTree,
}: QueryTabContentProps): React.JSX.Element {
  const [draft, setDraft] = useState(tab.query ?? '');
  const [inputError, setInputError] = useState<string | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const available = accounts.some(
    (account) =>
      account.serverUrl === tab.accountServerUrl && account.username === tab.accountUsername,
  );
  const compiled = useMemo(() => {
    try {
      return {
        query: available ? compileQuery(tab.query ?? '') : null,
        error: available ? null : 'アカウントが見つかりません',
      };
    } catch (error) {
      return { query: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [tab.query, available]);
  const timeline = useQueryTimeline(tab, compiled.query);
  const apply = async (): Promise<void> => {
    try {
      compileQuery(draft);
      setInputError(null);
      await onSaveQuery(tab.id, draft);
      if (draft === tab.query) timeline.refresh();
    } catch (error) {
      setInputError(error instanceof Error ? error.message : String(error));
    }
  };
  const handleReply = useCallback(
    (post: Post) => {
      onReply(tab, post);
    },
    [onReply, tab],
  );
  const handleQuote = useCallback(
    (post: Post) => {
      onQuote(tab, post);
    },
    [onQuote, tab],
  );
  const handleAccount = useCallback(
    (target: { id: string; acct: string }) => {
      onOpenAccountTimeline(tab, target);
    },
    [onOpenAccountTimeline, tab],
  );
  const handleHashtag = useCallback(
    (hashtag: string) => {
      onOpenHashtagTimeline(tab, hashtag);
    },
    [onOpenHashtagTimeline, tab],
  );
  const handleReplyTree = useCallback(
    (post: Post) => {
      onOpenReplyTree(tab, post);
    },
    [onOpenReplyTree, tab],
  );
  const handleCollapse = useCallback(() => {
    setExpandedPostId(null);
  }, []);
  const renderPost = (post: Post): React.ReactNode =>
    settings.disableCompactDisplay || expandedPostId === post.id ? (
      <PostItem
        post={post}
        serverUrl={tab.accountServerUrl}
        username={tab.accountUsername}
        onReply={handleReply}
        onQuote={handleQuote}
        onOpenAccountTimeline={handleAccount}
        onOpenHashtagTimeline={handleHashtag}
        onOpenReplyTree={handleReplyTree}
        onPollChange={timeline.updatePoll}
        onCollapse={settings.disableCompactDisplay ? undefined : handleCollapse}
      />
    ) : (
      <CompactPostItem
        post={post}
        onClick={setExpandedPostId}
        onOpenAccountTimeline={handleAccount}
      />
    );
  return (
    <Flex vertical style={{ flex: 1, minHeight: 0 }}>
      <Flex vertical gap={8} style={{ padding: 8 }}>
        <Input.TextArea
          aria-label="検索クエリ"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          autoSize={{ minRows: 2, maxRows: 6 }}
          maxLength={10000}
        />
        <Flex gap={8}>
          <Button
            type="primary"
            onClick={() => {
              void apply();
            }}
            disabled={!available}
          >
            検索・保存
          </Button>
          <Button onClick={timeline.refresh} disabled={!compiled.query} loading={timeline.loading}>
            再取得
          </Button>
        </Flex>
        <Typography.Text type="secondary">
          選択アカウントのタイムラインを検索します。過去の投稿は「さらに取得」で読み込みます。
        </Typography.Text>
        {inputError || compiled.error ? (
          <Alert type="error" title={inputError ?? compiled.error} />
        ) : null}
        {timeline.error ? <Alert type="warning" title={timeline.error} /> : null}
      </Flex>
      <VirtualizedPostList
        posts={timeline.posts}
        listRef={listRef}
        renderPost={renderPost}
        estimateRowHeight={
          settings.disableCompactDisplay ? 150 : Math.max(settings.compactFontSize + 10, 20)
        }
        empty={
          <Typography.Paragraph style={{ padding: 16 }}>
            {timeline.loading ? '取得中…' : '条件に一致する投稿がありません'}
          </Typography.Paragraph>
        }
        footer={
          <Button
            block
            onClick={timeline.loadMore}
            loading={timeline.loading}
            disabled={!timeline.hasMore || !compiled.query}
          >
            さらに取得
          </Button>
        }
      />
    </Flex>
  );
}
