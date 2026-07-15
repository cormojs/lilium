import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Tabs,
  Modal,
  Select,
  Button,
  App,
  Flex,
  Typography,
  Spin,
  Dropdown,
  Tooltip,
  Input,
} from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  MoreOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons';
import sanitizeHtml from 'sanitize-html';
import styled from 'styled-components';
import type {
  Account,
  AccountProfile,
  AccountProfileField,
  MastoNotification,
  PaneDefinition,
  Post,
  PostPoll,
  StreamConnectionStatus,
  StreamType,
  TabDefinition,
  TimelineType,
} from '../../shared/types.ts';
import { PostItem } from '../components/PostItem.tsx';
import { NotificationItem } from '../components/NotificationItem.tsx';
import { Composer, type ComposerStatusDraft } from '../components/Composer.tsx';
import { CompactPostItem } from '../components/CompactPostItem.tsx';
import { PaneContainer } from '../components/PaneContainer.tsx';
import { VirtualizedPostList } from '../components/VirtualizedPostList.tsx';
import { useSettings } from '../hooks/useSettings.ts';
import { replaceCustomEmojis } from '../components/customEmojis.ts';

const { Text } = Typography;
const MAX_POLL_EXPIRATION_TIMER_MS = 2_147_483_647;
// ストリーミング受信で保持する投稿・通知の上限。超過分は末尾 (古い側) から破棄する
const MAX_TIMELINE_ITEMS = 400;

interface AccountTimelineTarget {
  id: string;
  acct: string;
}

interface TimelinePageProps {
  accounts: Account[];
  onNavigateToLogin: () => void;
  onNavigateToSettings: () => void;
}

const PageContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

const TimelineList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const AccountHeader = styled.div`
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
`;

const AccountHeaderImage = styled.img`
  display: block;
  width: 100%;
  height: 140px;
  background-color: #f5f5f5;
  object-fit: cover;
`;

const AccountHeaderBody = styled.div`
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 16px;
  padding: 0 16px 16px;
`;

const AccountHeaderAvatar = styled.img`
  width: 96px;
  height: 96px;
  border-radius: 8px;
  border: 4px solid #fff;
  margin-top: -32px;
  background: #fff;
`;

const AccountHeaderContent = styled.div`
  min-width: 0;
  padding-top: 12px;
`;

const AccountHeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
`;

const AccountIdentityButton = styled.button`
  background: none;
  border: 0;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
  min-width: 0;
`;

const AccountDisplayName = styled.div`
  font-weight: 700;
  font-size: 18px;
  color: #262626;
  word-break: break-word;

  .custom-emoji {
    height: 1em;
    width: auto;
    vertical-align: middle;
    margin: 0 1px;
  }
`;

const AccountAcct = styled.div`
  display: inline-block;
  color: #8c8c8c;
  margin-top: 2px;
`;

const AccountNote = styled.div`
  margin-top: 8px;
  color: #262626;
  line-height: 1.5;
  word-break: break-word;

  p {
    margin: 0 0 4px;
  }

  a {
    color: #1677ff;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .custom-emoji {
    height: 1em;
    width: auto;
    vertical-align: middle;
  }
`;

const AccountFields = styled.div`
  margin-top: 12px;
  display: grid;
  gap: 8px;
`;

const AccountFieldItem = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
  align-items: start;
`;

const AccountFieldName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #595959;
  word-break: break-word;
`;

const AccountFieldValue = styled.div`
  color: #262626;
  line-height: 1.5;
  word-break: break-word;

  p {
    margin: 0 0 4px;
  }

  a {
    color: #1677ff;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .custom-emoji {
    height: 1em;
    width: auto;
    vertical-align: middle;
  }
`;

const AccountFieldVerified = styled.span`
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: #389e0d;
`;

const AccountHeaderActions = styled.div`
  display: flex;
  flex-shrink: 0;
`;

const AccountStats = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 10px;
  color: #8c8c8c;
`;

const EmptyMessage = styled.div`
  padding: 48px;
  text-align: center;
  color: #8c8c8c;
`;

const SpinContainer = styled.div`
  padding: 24px;
  text-align: center;
`;

const StyledTabs = styled(Tabs)`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;

  .ant-tabs-content-holder {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .ant-tabs-content {
    height: 100%;
  }

  .ant-tabs-tabpane-active {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
`;

const TabLabelWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const CONNECTION_STATUS_COLORS: Record<StreamConnectionStatus, string> = {
  streaming: '#52c41a',
  polling: '#faad14',
  disconnected: '#ff4d4f',
};

const CONNECTION_STATUS_LABELS: Record<StreamConnectionStatus, string> = {
  streaming: 'Streaming',
  polling: 'Polling',
  disconnected: 'Disconnected',
};

const StatusDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${(props) => props.$color};
`;

const TIMELINE_TYPE_LABELS: Record<TimelineType, string> = {
  home: 'Home',
  public: 'Public',
  local: 'Local',
  favourites: 'Favourites',
  notifications: 'Notifications',
  account: 'Account',
};

const TIMELINE_TYPE_OPTIONS: { value: TimelineType; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'public', label: 'Public' },
  { value: 'local', label: 'Local' },
  { value: 'favourites', label: 'Favourites' },
  { value: 'notifications', label: 'Notifications' },
];

function generateId(): string {
  return crypto.randomUUID();
}

function getStreamType(timelineType: TimelineType): StreamType | null {
  switch (timelineType) {
    case 'home':
      return 'user';
    case 'public':
      return 'public';
    case 'local':
      return 'publicLocal';
    default:
      return null;
  }
}

function buildTabLabel(tab: TabDefinition, accounts: Account[]): string {
  if (tab.customName && tab.customName.trim().length > 0) {
    return tab.customName;
  }
  if (tab.timelineType === 'account' && tab.targetAccountAcct) {
    return `@${tab.targetAccountAcct}`;
  }
  const account = accounts.find(
    (a) => a.serverUrl === tab.accountServerUrl && a.username === tab.accountUsername,
  );
  const acct = account ? `@${account.username}@${new URL(account.serverUrl).host}` : '?';
  return `${TIMELINE_TYPE_LABELS[tab.timelineType]} ${acct}`;
}

function createStatusPreview(content: string): string | undefined {
  const preview = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return preview.length > 0 ? preview : undefined;
}

function sanitizeProfileHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['a', 'br', 'p', 'span', 'em', 'strong', 'b', 'i', 'u', 'code', 'img'],
    allowedAttributes: {
      a: ['href', 'rel', 'target', 'class'],
      span: ['class'],
      img: ['src', 'alt', 'title', 'class'],
    },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const countFormatter = new Intl.NumberFormat();

function formatCount(count: number): string {
  return countFormatter.format(count);
}

function getAccountKey(serverUrl: string, username: string): string {
  return `${serverUrl}|${username}`;
}

function handleAccountProfileLinkClick(event: React.MouseEvent): void {
  const anchor = event.target instanceof Element ? event.target.closest('a') : null;
  if (!anchor) return;

  event.preventDefault();
  const url = anchor.getAttribute('href');
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    window.open(url, '_blank');
  }
}

function renderAccountField(
  field: AccountProfileField,
  emojis: AccountProfile['emojis'],
): React.JSX.Element {
  return (
    <AccountFieldItem key={`${field.name}-${field.value}`}>
      <AccountFieldName>{field.name}</AccountFieldName>
      <div>
        <AccountFieldValue
          onClick={handleAccountProfileLinkClick}
          dangerouslySetInnerHTML={{
            __html: sanitizeProfileHtml(replaceCustomEmojis(field.value, emojis)),
          }}
        />
        {field.verifiedAt ? <AccountFieldVerified>認証済み</AccountFieldVerified> : null}
      </div>
    </AccountFieldItem>
  );
}

function AccountProfileHeader({
  profile,
  onToggleFollow,
  followBusy,
}: {
  profile: AccountProfile;
  onToggleFollow: () => void;
  followBusy: boolean;
}): React.JSX.Element {
  const displayName = profile.displayName.trim().length > 0 ? profile.displayName : profile.acct;
  const followLabel = profile.requested
    ? 'リクエスト中'
    : profile.following
      ? 'フォロー中'
      : 'フォロー';
  const followIcon =
    profile.requested || profile.following ? <UserDeleteOutlined /> : <UserAddOutlined />;

  return (
    <AccountHeader>
      <AccountHeaderImage src={profile.headerUrl} alt="" />
      <AccountHeaderBody>
        <AccountHeaderAvatar src={profile.avatarUrl} alt={profile.acct} />
        <AccountHeaderContent>
          <AccountHeaderTop>
            <div>
              <AccountDisplayName
                dangerouslySetInnerHTML={{
                  __html: sanitizeProfileHtml(
                    replaceCustomEmojis(escapeHtml(displayName), profile.emojis),
                  ),
                }}
              />
              <AccountIdentityButton
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  window.open(profile.url, '_blank');
                }}
              >
                <AccountAcct>@{profile.acct}</AccountAcct>
              </AccountIdentityButton>
            </div>
            <AccountHeaderActions>
              <Button
                type={profile.following || profile.requested ? 'default' : 'primary'}
                icon={followIcon}
                loading={followBusy}
                onClick={onToggleFollow}
                disabled={followBusy}
              >
                {followLabel}
              </Button>
            </AccountHeaderActions>
          </AccountHeaderTop>
          {profile.note.trim().length > 0 ? (
            <AccountNote
              onClick={handleAccountProfileLinkClick}
              dangerouslySetInnerHTML={{
                __html: sanitizeProfileHtml(replaceCustomEmojis(profile.note, profile.emojis)),
              }}
            />
          ) : null}
          {profile.fields.length > 0 ? (
            <AccountFields>
              {profile.fields.map((field) => renderAccountField(field, profile.emojis))}
            </AccountFields>
          ) : null}
          <AccountStats>
            <span>{formatCount(profile.statusesCount)} 投稿</span>
            <span>{formatCount(profile.followingCount)} フォロー</span>
            <span>{formatCount(profile.followersCount)} フォロワー</span>
          </AccountStats>
        </AccountHeaderContent>
      </AccountHeaderBody>
    </AccountHeader>
  );
}

interface PollExpirationTarget {
  postId: string;
  pollId: string;
  expiresAt: string;
  statusPreview?: string;
  iconUrl: string;
}

function useTimelinePollExpirationNotifications({
  accountServerUrl,
  accountUsername,
  posts,
  setPosts,
  message,
}: {
  accountServerUrl: string | undefined;
  accountUsername: string | undefined;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  message: ReturnType<typeof App.useApp>['message'];
}): void {
  // posts はストリーミング受信のたびに新しい配列になるため、posts をそのまま依存に
  // するとタイマーが毎回張り直される。タイマー設定に必要な情報だけを文字列化し、
  // 未終了の投票の集合が実際に変わったときのみ効果を再実行する
  const targets: PollExpirationTarget[] = [];
  for (const post of posts) {
    const poll = post.poll;
    if (!poll || poll.expired || poll.expiresAt === null) {
      continue;
    }
    targets.push({
      postId: post.id,
      pollId: poll.id,
      expiresAt: poll.expiresAt,
      statusPreview: createStatusPreview(post.content),
      iconUrl: post.account.avatarUrl,
    });
  }
  const targetsJson = JSON.stringify(targets);

  useEffect(() => {
    if (!accountServerUrl || !accountUsername) return;

    const timers: number[] = [];
    for (const target of JSON.parse(targetsJson) as PollExpirationTarget[]) {
      const delay = new Date(target.expiresAt).getTime() - Date.now();
      if (delay <= 0 || delay > MAX_POLL_EXPIRATION_TIMER_MS) {
        continue;
      }

      const timer = window.setTimeout(() => {
        void window.api
          .refreshPoll({
            serverUrl: accountServerUrl,
            username: accountUsername,
            pollId: target.pollId,
          })
          .then((updatedPoll) => {
            setPosts((prev) =>
              prev.map((currentPost) =>
                currentPost.id === target.postId
                  ? { ...currentPost, poll: updatedPoll }
                  : currentPost,
              ),
            );
            void window.api.showNotification({
              title: '投票が終了しました',
              body: target.statusPreview,
              iconUrl: target.iconUrl,
            });
          })
          .catch((error: unknown) => {
            message.error(
              `投票結果の再取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
            );
          });
      }, delay);

      timers.push(timer);
    }

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [accountServerUrl, accountUsername, message, setPosts, targetsJson]);
}

function useScrollLoadMore({
  listRef,
  loadMore,
  itemCount,
}: {
  listRef: React.RefObject<HTMLDivElement | null>;
  loadMore: () => void | Promise<void>;
  itemCount: number;
}): void {
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const checkAndLoad = (): void => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        void loadMore();
      }
    };
    checkAndLoad();
    el.addEventListener('scroll', checkAndLoad, { passive: true });
    return () => {
      el.removeEventListener('scroll', checkAndLoad);
    };
  }, [itemCount, listRef, loadMore]);
}

function useTimelineStream({
  accountServerUrl,
  accountUsername,
  tabId,
  timelineType,
  setPosts,
}: {
  accountServerUrl: string | undefined;
  accountUsername: string | undefined;
  tabId: string;
  timelineType: TimelineType;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
}): void {
  useEffect(() => {
    if (!accountServerUrl || !accountUsername) return;
    const streamType = getStreamType(timelineType);
    if (!streamType) return;

    const subscriptionId = `timeline-${tabId}`;
    void window.api.subscribeStream({
      serverUrl: accountServerUrl,
      username: accountUsername,
      streamType,
      subscriptionId,
    });

    const removeListener = window.api.onStreamEvent((event) => {
      if (event.subscriptionId !== subscriptionId) return;
      if (event.event === 'update') {
        const post = event.payload as Post;
        setPosts((prev) => {
          if (prev.some((p) => p.id === post.id)) return prev;
          return [post, ...prev].slice(0, MAX_TIMELINE_ITEMS);
        });
      } else if (event.event === 'delete') {
        setPosts((prev) => prev.filter((p) => p.id !== event.payload));
      }
    });

    return () => {
      removeListener();
      void window.api.unsubscribeStream(subscriptionId);
    };
  }, [accountServerUrl, accountUsername, setPosts, tabId, timelineType]);
}

function TimelineTabContent({
  tab,
  accounts,
  onReply,
  onQuote,
  onOpenAccountTimeline,
}: {
  tab: TabDefinition;
  accounts: Account[];
  onReply: (tab: TabDefinition, post: Post) => void;
  onQuote: (tab: TabDefinition, post: Post) => void;
  onOpenAccountTimeline: (tab: TabDefinition, target: AccountTimelineTarget) => void;
}): React.JSX.Element {
  const { message } = App.useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const { settings } = useSettings();
  const listRef = useRef<HTMLDivElement>(null);
  const postsRef = useRef(posts);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const accountByKey = new Map(
    accounts.map((account) => [getAccountKey(account.serverUrl, account.username), account]),
  );
  const account = accountByKey.get(getAccountKey(tab.accountServerUrl, tab.accountUsername));
  const accountServerUrl = account?.serverUrl;
  const accountUsername = account?.username;

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const handlePollChange = useCallback((postId: string, poll: PostPoll): void => {
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, poll } : post)));
  }, []);

  // 行コンポーネント (PostItem / CompactPostItem) は React.memo でメモ化しているため、
  // 投稿ごとのインラインクロージャではなく安定した参照のコールバックを渡す
  const handleReplyPost = useCallback(
    (targetPost: Post): void => {
      onReply(tab, targetPost);
    },
    [onReply, tab],
  );

  const handleQuotePost = useCallback(
    (targetPost: Post): void => {
      onQuote(tab, targetPost);
    },
    [onQuote, tab],
  );

  const handleOpenAccountTimeline = useCallback(
    (target: AccountTimelineTarget): void => {
      onOpenAccountTimeline(tab, target);
    },
    [onOpenAccountTimeline, tab],
  );

  const handleCollapsePost = useCallback((): void => {
    setExpandedPostId(null);
  }, []);

  const handleExpandPost = useCallback((postId: string): void => {
    setExpandedPostId(postId);
  }, []);

  const loadTimeline = useCallback(async () => {
    if (!accountServerUrl || !accountUsername) return;
    setLoading(true);
    hasMoreRef.current = true;
    try {
      if (tab.timelineType === 'account') {
        if (!tab.targetAccountId) {
          throw new Error('アカウントIDが設定されていません');
        }
        const profile = await window.api.fetchAccountProfile({
          serverUrl: accountServerUrl,
          username: accountUsername,
          accountId: tab.targetAccountId,
        });
        setAccountProfile(profile);
      } else {
        setAccountProfile(null);
      }
      const result = await window.api.fetchTimeline({
        serverUrl: accountServerUrl,
        username: accountUsername,
        type: tab.timelineType,
        accountId: tab.targetAccountId,
      });
      setPosts(result);
    } catch (e) {
      message.error(
        `タイムラインの取得に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setLoading(false);
    }
  }, [accountServerUrl, accountUsername, tab.timelineType, tab.targetAccountId, message]);

  const handleRefresh = useCallback(() => {
    setPosts([]);
    void loadTimeline();
  }, [loadTimeline]);

  const handleToggleFollow = useCallback(async (): Promise<void> => {
    if (!accountServerUrl || !accountUsername || !accountProfile) return;
    if (!tab.targetAccountId) return;

    setFollowBusy(true);
    try {
      const result =
        accountProfile.following || accountProfile.requested
          ? await window.api.unfollowAccount({
              serverUrl: accountServerUrl,
              username: accountUsername,
              accountId: tab.targetAccountId,
            })
          : await window.api.followAccount({
              serverUrl: accountServerUrl,
              username: accountUsername,
              accountId: tab.targetAccountId,
            });

      setAccountProfile((prev) =>
        prev
          ? {
              ...prev,
              following: result.following,
              requested: result.requested,
            }
          : prev,
      );
    } catch (e) {
      message.error(`フォロー操作に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setFollowBusy(false);
    }
  }, [accountServerUrl, accountUsername, accountProfile, message, tab.targetAccountId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRefresh]);

  const loadMore = useCallback(async () => {
    if (!accountServerUrl || !accountUsername || loadingMoreRef.current || !hasMoreRef.current)
      return;
    const currentPosts = postsRef.current;
    if (currentPosts.length === 0) return;
    const lastPost = currentPosts[currentPosts.length - 1];
    if (!lastPost) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await window.api.fetchTimeline({
        serverUrl: accountServerUrl,
        username: accountUsername,
        type: tab.timelineType,
        accountId: tab.targetAccountId,
        maxId: lastPost.id,
      });
      if (result.length > 0) {
        setPosts((prev) => [...prev, ...result]);
      } else {
        hasMoreRef.current = false;
      }
    } catch (e) {
      message.error(
        `タイムラインの取得に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [accountServerUrl, accountUsername, tab.timelineType, tab.targetAccountId, message]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  useTimelinePollExpirationNotifications({
    accountServerUrl,
    accountUsername,
    posts,
    setPosts,
    message,
  });
  useScrollLoadMore({ listRef, loadMore, itemCount: posts.length });
  useTimelineStream({
    accountServerUrl,
    accountUsername,
    tabId: tab.id,
    timelineType: tab.timelineType,
    setPosts,
  });

  if (!account) {
    return <EmptyMessage>アカウントが見つかりません</EmptyMessage>;
  }

  if (loading && posts.length === 0) {
    return (
      <SpinContainer>
        <Spin />
      </SpinContainer>
    );
  }

  if (posts.length === 0 && tab.timelineType !== 'account') {
    return <EmptyMessage>投稿がありません</EmptyMessage>;
  }

  const compactRowHeight = Math.max(Math.max(settings.compactFontSize, 8) + 10, 20);
  const estimateRowHeight = settings.disableCompactDisplay ? 150 : compactRowHeight;

  const renderPost = (post: Post): React.ReactNode =>
    settings.disableCompactDisplay || expandedPostId === post.id ? (
      <PostItem
        post={post}
        serverUrl={account.serverUrl}
        username={account.username}
        onReply={handleReplyPost}
        onQuote={handleQuotePost}
        onOpenAccountTimeline={handleOpenAccountTimeline}
        onPollChange={handlePollChange}
        onCollapse={settings.disableCompactDisplay ? undefined : handleCollapsePost}
      />
    ) : (
      <CompactPostItem
        post={post}
        onClick={handleExpandPost}
        onOpenAccountTimeline={handleOpenAccountTimeline}
      />
    );

  return (
    <VirtualizedPostList
      posts={posts}
      estimateRowHeight={estimateRowHeight}
      listRef={listRef}
      renderPost={renderPost}
      header={
        accountProfile ? (
          <AccountProfileHeader
            profile={accountProfile}
            onToggleFollow={() => {
              void handleToggleFollow();
            }}
            followBusy={followBusy}
          />
        ) : undefined
      }
      empty={<EmptyMessage>投稿がありません</EmptyMessage>}
      footer={
        loadingMore ? (
          <SpinContainer>
            <Spin size="small" />
          </SpinContainer>
        ) : null
      }
    />
  );
}

function NotificationTabContent({
  tab,
  accounts,
  onOpenAccountTimeline,
}: {
  tab: TabDefinition;
  accounts: Account[];
  onOpenAccountTimeline: (tab: TabDefinition, target: AccountTimelineTarget) => void;
}): React.JSX.Element {
  const { message } = App.useApp();
  const [notifications, setNotifications] = useState<MastoNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef(notifications);
  const notificationsEnabledRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const accountByKey = new Map(
    accounts.map((account) => [getAccountKey(account.serverUrl, account.username), account]),
  );
  const account = accountByKey.get(getAccountKey(tab.accountServerUrl, tab.accountUsername));
  const accountServerUrl = account?.serverUrl;
  const accountUsername = account?.username;

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const loadNotifications = useCallback(async () => {
    if (!accountServerUrl || !accountUsername) return;
    setLoading(true);
    hasMoreRef.current = true;
    try {
      const result = await window.api.fetchNotifications({
        serverUrl: accountServerUrl,
        username: accountUsername,
      });
      setNotifications(result);
    } catch (e) {
      message.error(`通知の取得に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [accountServerUrl, accountUsername, message]);

  const loadMoreNotifications = useCallback(async () => {
    if (!accountServerUrl || !accountUsername || loadingMoreRef.current || !hasMoreRef.current)
      return;
    const currentNotifications = notificationsRef.current;
    if (currentNotifications.length === 0) return;
    const lastNotification = currentNotifications[currentNotifications.length - 1];
    if (!lastNotification) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await window.api.fetchNotifications({
        serverUrl: accountServerUrl,
        username: accountUsername,
        maxId: lastNotification.id,
      });
      if (result.length > 0) {
        setNotifications((prev) => [...prev, ...result]);
      } else {
        hasMoreRef.current = false;
      }
    } catch (e) {
      message.error(`通知の取得に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [accountServerUrl, accountUsername, message]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // NotificationItem は React.memo でメモ化しているため、安定した参照のコールバックを渡す
  const handleOpenAccountTimeline = useCallback(
    (target: AccountTimelineTarget): void => {
      onOpenAccountTimeline(tab, target);
    },
    [onOpenAccountTimeline, tab],
  );

  // System notifications are handled via Electron's Notification module in the main process

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const checkAndLoad = (): void => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        void loadMoreNotifications();
      }
    };
    checkAndLoad();
    el.addEventListener('scroll', checkAndLoad, { passive: true });
    return () => {
      el.removeEventListener('scroll', checkAndLoad);
    };
  }, [loadMoreNotifications, notifications.length]);

  // Subscribe to user stream for real-time notification updates
  useEffect(() => {
    if (!accountServerUrl || !accountUsername) return;

    const subscriptionId = `notifications-${tab.id}`;
    void window.api.subscribeStream({
      serverUrl: accountServerUrl,
      username: accountUsername,
      streamType: 'user',
      subscriptionId,
    });

    const removeListener = window.api.onStreamEvent((event) => {
      if (event.subscriptionId !== subscriptionId) return;
      if (event.event === 'notification') {
        const notification = event.payload as MastoNotification;
        setNotifications((prev) => {
          if (prev.some((n) => n.id === notification.id)) {
            return prev;
          }

          if (notificationsEnabledRef.current) {
            const actor =
              notification.account.displayName.trim().length > 0
                ? notification.account.displayName
                : `@${notification.account.acct}`;
            const actionLabel: Record<MastoNotification['type'], string> = {
              follow: 'があなたをフォローしました',
              follow_request: 'からフォローリクエストが届きました',
              favourite: 'があなたの投稿をお気に入りに追加しました',
              reblog: 'があなたの投稿をブーストしました',
              poll: 'の投票が終了しました',
            };
            const statusPreview = notification.status
              ? createStatusPreview(notification.status.content)
              : undefined;
            const body = statusPreview;

            void window.api.showNotification({
              title: `${actor}${actionLabel[notification.type]}`,
              body,
              iconUrl: notification.account.avatarUrl,
            });
          }

          return [notification, ...prev].slice(0, MAX_TIMELINE_ITEMS);
        });
      }
    });

    return () => {
      removeListener();
      void window.api.unsubscribeStream(subscriptionId);
    };
  }, [accountServerUrl, accountUsername, tab.id]);

  if (!account) {
    return <EmptyMessage>アカウントが見つかりません</EmptyMessage>;
  }

  if (loading && notifications.length === 0) {
    return (
      <SpinContainer>
        <Spin />
      </SpinContainer>
    );
  }

  if (notifications.length === 0) {
    return <EmptyMessage>通知はありません</EmptyMessage>;
  }

  return (
    <TimelineList ref={listRef}>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onOpenAccountTimeline={handleOpenAccountTimeline}
        />
      ))}
      {loadingMore ? (
        <SpinContainer>
          <Spin size="small" />
        </SpinContainer>
      ) : null}
    </TimelineList>
  );
}

function TabContent({
  tab,
  accounts,
  onReply,
  onQuote,
  onOpenAccountTimeline,
}: {
  tab: TabDefinition;
  accounts: Account[];
  onReply: (tab: TabDefinition, post: Post) => void;
  onQuote: (tab: TabDefinition, post: Post) => void;
  onOpenAccountTimeline: (tab: TabDefinition, target: AccountTimelineTarget) => void;
}): React.JSX.Element {
  if (tab.timelineType === 'notifications') {
    return (
      <NotificationTabContent
        tab={tab}
        accounts={accounts}
        onOpenAccountTimeline={onOpenAccountTimeline}
      />
    );
  }
  return (
    <TimelineTabContent
      tab={tab}
      accounts={accounts}
      onReply={onReply}
      onQuote={onQuote}
      onOpenAccountTimeline={onOpenAccountTimeline}
    />
  );
}

interface PaneProps {
  pane: PaneDefinition;
  paneIndex: number;
  totalPanes: number;
  tabs: TabDefinition[];
  accounts: Account[];
  onActiveTabChange: (paneId: string, tabId: string) => void;
  onAddTab: (paneId: string) => void;
  onRemoveTab: (paneId: string, tabId: string) => void;
  onMoveTab: (tabId: string, fromPaneId: string, direction: 'left' | 'right') => void;
  onRenameTab: (tabId: string, name: string) => void;
  onReply: (tab: TabDefinition, post: Post) => void;
  onQuote: (tab: TabDefinition, post: Post) => void;
  onOpenAccountTimeline: (tab: TabDefinition, target: AccountTimelineTarget) => void;
}

function getSubscriptionIds(tab: TabDefinition): string[] {
  const streamType = getStreamType(tab.timelineType);
  if (!streamType) return [];
  if (tab.timelineType === 'notifications') {
    return [`notifications-${tab.id}`];
  }
  return [`timeline-${tab.id}`];
}

function Pane({
  pane,
  paneIndex,
  totalPanes,
  tabs,
  accounts,
  onActiveTabChange,
  onAddTab,
  onRemoveTab,
  onMoveTab,
  onRenameTab,
  onReply,
  onQuote,
  onOpenAccountTimeline,
}: PaneProps): React.JSX.Element {
  const [connectionStatuses, setConnectionStatuses] = useState<
    Record<string, StreamConnectionStatus>
  >({});
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTabId, setRenameTabId] = useState<string>('');
  const [renameValue, setRenameValue] = useState<string>('');

  useEffect(() => {
    const removeListener = window.api.onStreamConnectionStatus((data) => {
      setConnectionStatuses((prev) => ({
        ...prev,
        [data.subscriptionId]: data.status,
      }));
    });
    return removeListener;
  }, []);

  const tabById = new Map(tabs.map((tab) => [tab.id, tab]));
  const paneTabs: TabDefinition[] = [];
  for (const tabId of pane.tabIds) {
    const tab = tabById.get(tabId);
    if (tab) {
      paneTabs.push(tab);
    }
  }

  const tabItems = paneTabs.map((tab) => {
    const menuItems: { key: string; label: string; disabled?: boolean }[] = [
      { key: 'rename', label: '名前を変更' },
    ];
    if (totalPanes > 1) {
      menuItems.push(
        { key: 'left', label: '左のペインへ移動', disabled: paneIndex === 0 },
        { key: 'right', label: '右のペインへ移動', disabled: paneIndex === totalPanes - 1 },
      );
    }

    return {
      key: tab.id,
      label: (
        <TabLabelWrapper>
          {buildTabLabel(tab, accounts)}
          <Dropdown
            menu={{
              items: menuItems,
              onClick: ({ key }) => {
                if (key === 'rename') {
                  setRenameTabId(tab.id);
                  setRenameValue(buildTabLabel(tab, accounts));
                  setRenameModalOpen(true);
                } else {
                  onMoveTab(tab.id, pane.id, key as 'left' | 'right');
                }
              },
            }}
            trigger={['click']}
          >
            <MoreOutlined
              style={{ fontSize: 12, cursor: 'pointer', color: '#8c8c8c' }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            />
          </Dropdown>
          {(() => {
            const subIds = getSubscriptionIds(tab);
            const subId = subIds[0];
            if (!subId) return null;
            const status = connectionStatuses[subId];
            if (!status) return null;
            return (
              <Tooltip title={CONNECTION_STATUS_LABELS[status]}>
                <StatusDot $color={CONNECTION_STATUS_COLORS[status]} />
              </Tooltip>
            );
          })()}
        </TabLabelWrapper>
      ),
      children: (
        <TabContent
          tab={tab}
          accounts={accounts}
          onReply={onReply}
          onQuote={onQuote}
          onOpenAccountTimeline={onOpenAccountTimeline}
        />
      ),
      closable: paneTabs.length > 1 || totalPanes > 1,
    };
  });

  return (
    <>
      <StyledTabs
        type="editable-card"
        activeKey={pane.activeTabId}
        onChange={(key) => {
          onActiveTabChange(pane.id, key);
        }}
        onEdit={(targetKey, action) => {
          if (action === 'add') {
            onAddTab(pane.id);
          } else if (typeof targetKey === 'string') {
            onRemoveTab(pane.id, targetKey);
          }
        }}
        items={
          tabItems.length > 0
            ? tabItems
            : [
                {
                  key: '__empty__',
                  label: '',
                  children: <EmptyMessage>「＋」ボタンからタブを追加してください</EmptyMessage>,
                  closable: false,
                  disabled: true,
                },
              ]
        }
      />
      <Modal
        title="タブ名を変更"
        open={renameModalOpen}
        onOk={() => {
          onRenameTab(renameTabId, renameValue.trim());
          setRenameModalOpen(false);
        }}
        onCancel={() => {
          setRenameModalOpen(false);
        }}
        okText="変更"
        cancelText="キャンセル"
        destroyOnHidden
      >
        <Input
          value={renameValue}
          onChange={(e) => {
            setRenameValue(e.target.value);
          }}
          placeholder="タブ名を入力してください"
          maxLength={60}
          autoFocus
          onPressEnter={() => {
            onRenameTab(renameTabId, renameValue.trim());
            setRenameModalOpen(false);
          }}
        />
      </Modal>
    </>
  );
}

export function TimelinePage({
  accounts,
  onNavigateToLogin,
  onNavigateToSettings,
}: TimelinePageProps): React.JSX.Element {
  const [tabs, setTabs] = useState<TabDefinition[]>([]);
  const [panes, setPanes] = useState<PaneDefinition[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [statusDraft, setStatusDraft] = useState<ComposerStatusDraft | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPaneId, setModalPaneId] = useState<string>('');
  const [newTabAccount, setNewTabAccount] = useState<string>('');
  const [newTabType, setNewTabType] = useState<TimelineType>('home');
  const [newTabCustomName, setNewTabCustomName] = useState<string>('');

  // Load saved data on mount
  useEffect(() => {
    void Promise.all([window.api.listTabs(), window.api.loadPaneLayout()]).then(
      ([savedTabs, savedLayout]) => {
        if (savedTabs.length > 0 && savedLayout && savedLayout.panes.length > 0) {
          setTabs(savedTabs);
          setPanes(savedLayout.panes);
        } else if (savedTabs.length > 0) {
          // Migrate: existing tabs but no pane layout
          setTabs(savedTabs);
          const defaultPane: PaneDefinition = {
            id: generateId(),
            tabIds: savedTabs.map((t) => t.id),
            activeTabId: savedTabs[0]?.id ?? '',
            widthRatio: 1,
          };
          setPanes([defaultPane]);
        }
        setLoaded(true);
      },
    );
  }, []);

  // Initialize with a default tab if accounts exist and no saved tabs
  useEffect(() => {
    if (!loaded) return;
    const firstAccount = accounts[0];
    if (firstAccount && tabs.length === 0) {
      const defaultTab: TabDefinition = {
        id: generateId(),
        accountServerUrl: firstAccount.serverUrl,
        accountUsername: firstAccount.username,
        timelineType: 'home',
      };
      const defaultPane: PaneDefinition = {
        id: generateId(),
        tabIds: [defaultTab.id],
        activeTabId: defaultTab.id,
        widthRatio: 1,
      };
      setTabs([defaultTab]);
      setPanes([defaultPane]);
      void window.api.saveTabs([defaultTab]);
      void window.api.savePaneLayout({ panes: [defaultPane] });
    }
  }, [accounts, tabs.length, loaded]);

  const persistLayout = useCallback((newTabs: TabDefinition[], newPanes: PaneDefinition[]) => {
    void window.api.saveTabs(newTabs);
    void window.api.savePaneLayout({ panes: newPanes });
  }, []);

  const handleActiveTabChange = useCallback((paneId: string, tabId: string) => {
    setPanes((prev) => {
      const next = prev.map((p) => (p.id === paneId ? { ...p, activeTabId: tabId } : p));
      void window.api.savePaneLayout({ panes: next });
      return next;
    });
  }, []);

  const handleAddTab = useCallback(
    (paneId: string) => {
      setModalPaneId(paneId);
      const firstOption = accounts[0];
      if (firstOption) {
        setNewTabAccount(`${firstOption.serverUrl}|${firstOption.username}`);
      }
      setModalOpen(true);
    },
    [accounts],
  );

  const handleConfirmAddTab = useCallback((): void => {
    if (!newTabAccount) return;
    const parts = newTabAccount.split('|');
    const serverUrl = parts[0] ?? '';
    const username = parts[1] ?? '';
    const tab: TabDefinition = {
      id: generateId(),
      accountServerUrl: serverUrl,
      accountUsername: username,
      timelineType: newTabType,
      customName: newTabCustomName.trim() || undefined,
    };

    setTabs((prevTabs) => {
      const nextTabs = [...prevTabs, tab];
      setPanes((prevPanes) => {
        const nextPanes = prevPanes.map((p) =>
          p.id === modalPaneId ? { ...p, tabIds: [...p.tabIds, tab.id], activeTabId: tab.id } : p,
        );
        persistLayout(nextTabs, nextPanes);
        return nextPanes;
      });
      return nextTabs;
    });

    setModalOpen(false);
    setNewTabAccount('');
    setNewTabType('home');
    setNewTabCustomName('');
  }, [newTabAccount, newTabType, newTabCustomName, modalPaneId, persistLayout]);

  const handleRemoveTab = useCallback(
    (paneId: string, tabId: string): void => {
      setPanes((prevPanes) => {
        const pane = prevPanes.find((p) => p.id === paneId);
        if (!pane) return prevPanes;

        const newTabIds = pane.tabIds.filter((id) => id !== tabId);

        // If pane becomes empty, remove the pane (unless it's the last one)
        if (newTabIds.length === 0 && prevPanes.length > 1) {
          const nextPanes = prevPanes.filter((p) => p.id !== paneId);
          // Normalize width ratios
          const totalRatio = nextPanes.reduce((sum, p) => sum + p.widthRatio, 0);
          const normalizedPanes = nextPanes.map((p) => ({
            ...p,
            widthRatio: p.widthRatio / totalRatio,
          }));

          setTabs((prevTabs) => {
            const nextTabs = prevTabs.filter((t) => t.id !== tabId);
            persistLayout(nextTabs, normalizedPanes);
            return nextTabs;
          });
          return normalizedPanes;
        }

        const newActiveTabId = pane.activeTabId === tabId ? (newTabIds[0] ?? '') : pane.activeTabId;

        const nextPanes = prevPanes.map((p) =>
          p.id === paneId ? { ...p, tabIds: newTabIds, activeTabId: newActiveTabId } : p,
        );

        setTabs((prevTabs) => {
          const nextTabs = prevTabs.filter((t) => t.id !== tabId);
          persistLayout(nextTabs, nextPanes);
          return nextTabs;
        });
        return nextPanes;
      });
    },
    [persistLayout],
  );

  const handleMoveTab = useCallback(
    (tabId: string, fromPaneId: string, direction: 'left' | 'right'): void => {
      setPanes((prevPanes) => {
        const fromIndex = prevPanes.findIndex((p) => p.id === fromPaneId);
        if (fromIndex === -1) return prevPanes;

        const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= prevPanes.length) return prevPanes;

        const fromPane = prevPanes[fromIndex];
        const toPane = prevPanes[toIndex];
        if (!fromPane || !toPane) return prevPanes;

        const newFromTabIds = fromPane.tabIds.filter((id) => id !== tabId);
        const newFromActiveTabId =
          fromPane.activeTabId === tabId ? (newFromTabIds[0] ?? '') : fromPane.activeTabId;

        let nextPanes = prevPanes.map((p, i) => {
          if (i === fromIndex) {
            return { ...p, tabIds: newFromTabIds, activeTabId: newFromActiveTabId };
          }
          if (i === toIndex) {
            return { ...p, tabIds: [...toPane.tabIds, tabId], activeTabId: tabId };
          }
          return p;
        });

        // Remove empty panes (unless it's the last one)
        if (newFromTabIds.length === 0 && nextPanes.length > 1) {
          nextPanes = nextPanes.filter((p) => p.id !== fromPaneId);
          const totalRatio = nextPanes.reduce((sum, p) => sum + p.widthRatio, 0);
          nextPanes = nextPanes.map((p) => ({
            ...p,
            widthRatio: p.widthRatio / totalRatio,
          }));
        }

        void window.api.savePaneLayout({ panes: nextPanes });
        return nextPanes;
      });
    },
    [],
  );

  const handleWidthRatiosChange = useCallback((ratios: number[]): void => {
    setPanes((prevPanes) => {
      const nextPanes = prevPanes.map((p, i) => ({
        ...p,
        widthRatio: ratios[i] ?? p.widthRatio,
      }));
      void window.api.savePaneLayout({ panes: nextPanes });
      return nextPanes;
    });
  }, []);

  const handleAddPane = useCallback((position: 'left' | 'right'): void => {
    const newPane: PaneDefinition = {
      id: generateId(),
      tabIds: [],
      activeTabId: '',
      widthRatio: 1,
    };

    setPanes((prevPanes) => {
      const nextPanes = position === 'left' ? [newPane, ...prevPanes] : [...prevPanes, newPane];
      // Normalize ratios
      const totalRatio = nextPanes.reduce((sum, p) => sum + p.widthRatio, 0);
      const normalizedPanes = nextPanes.map((p) => ({
        ...p,
        widthRatio: p.widthRatio / totalRatio,
      }));
      void window.api.savePaneLayout({ panes: normalizedPanes });
      return normalizedPanes;
    });
  }, []);

  const handleRenameTab = useCallback((tabId: string, name: string): void => {
    setTabs((prevTabs) => {
      const nextTabs = prevTabs.map((tab) =>
        tab.id === tabId ? { ...tab, customName: name || undefined } : tab,
      );
      void window.api.saveTabs(nextTabs);
      return nextTabs;
    });
  }, []);

  const accountOptions = accounts.map((account) => ({
    value: getAccountKey(account.serverUrl, account.username),
    label: `@${account.username}@${new URL(account.serverUrl).host}`,
  }));

  const handleReply = useCallback((tab: TabDefinition, post: Post): void => {
    setStatusDraft({
      type: 'reply',
      serverUrl: tab.accountServerUrl,
      username: tab.accountUsername,
      postId: post.id,
      acct: post.account.acct,
    });
  }, []);

  const handleQuote = (tab: TabDefinition, post: Post): void => {
    setStatusDraft({
      type: 'quote',
      serverUrl: tab.accountServerUrl,
      username: tab.accountUsername,
      postId: post.id,
      acct: post.account.acct,
    });
  };

  const handleOpenAccountTimeline = useCallback(
    (sourceTab: TabDefinition, target: AccountTimelineTarget): void => {
      const targetPane = panes.find((pane) => pane.tabIds.includes(sourceTab.id)) ?? panes[0];
      if (!targetPane) return;

      const accountTab: TabDefinition = {
        id: generateId(),
        accountServerUrl: sourceTab.accountServerUrl,
        accountUsername: sourceTab.accountUsername,
        timelineType: 'account',
        targetAccountId: target.id,
        targetAccountAcct: target.acct,
      };

      setTabs((prevTabs) => {
        const nextTabs = [...prevTabs, accountTab];
        setPanes((prevPanes) => {
          const nextPanes = prevPanes.map((pane) =>
            pane.id === targetPane.id
              ? {
                  ...pane,
                  tabIds: [...pane.tabIds, accountTab.id],
                  activeTabId: accountTab.id,
                }
              : pane,
          );
          persistLayout(nextTabs, nextPanes);
          return nextPanes;
        });
        return nextTabs;
      });
    },
    [panes, persistLayout],
  );

  const handleClearStatusDraft = (): void => {
    setStatusDraft(null);
  };

  const widthRatios = panes.map((pane) => pane.widthRatio);

  return (
    <PageContainer>
      <Flex align="flex-start" style={{ flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Composer
            accounts={accounts}
            statusDraft={statusDraft}
            onClearStatusDraft={handleClearStatusDraft}
          />
        </div>
        <Flex vertical align="center" style={{ padding: '8px 4px 0 0', flexShrink: 0 }}>
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={onNavigateToSettings}
            title="設定"
            size="small"
          />
          <Button
            type="text"
            icon={<UserOutlined />}
            onClick={onNavigateToLogin}
            title="アカウント管理"
            size="small"
          />
        </Flex>
      </Flex>
      <PaneContainer
        paneCount={panes.length}
        widthRatios={widthRatios}
        onWidthRatiosChange={handleWidthRatiosChange}
        onAddPane={handleAddPane}
      >
        {panes.map((pane, index) => (
          <Pane
            key={pane.id}
            pane={pane}
            paneIndex={index}
            totalPanes={panes.length}
            tabs={tabs}
            accounts={accounts}
            onActiveTabChange={handleActiveTabChange}
            onAddTab={handleAddTab}
            onRemoveTab={handleRemoveTab}
            onMoveTab={handleMoveTab}
            onRenameTab={handleRenameTab}
            onReply={handleReply}
            onQuote={handleQuote}
            onOpenAccountTimeline={handleOpenAccountTimeline}
          />
        ))}
      </PaneContainer>

      <Modal
        title="タブを追加"
        open={modalOpen}
        onOk={handleConfirmAddTab}
        onCancel={() => {
          setModalOpen(false);
        }}
        okText="追加"
        cancelText="キャンセル"
        okButtonProps={{ disabled: !newTabAccount }}
      >
        <Flex vertical gap={16} style={{ marginTop: 16 }}>
          <div>
            <Text strong>アカウント</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={newTabAccount || undefined}
              onChange={setNewTabAccount}
              options={accountOptions}
              placeholder="アカウントを選択"
            />
          </div>
          <div>
            <Text strong>タイムラインの種類</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={newTabType}
              onChange={setNewTabType}
              options={TIMELINE_TYPE_OPTIONS}
            />
          </div>
          <div>
            <Text strong>タブ名 (任意)</Text>
            <Input
              style={{ marginTop: 8 }}
              value={newTabCustomName}
              onChange={(event) => {
                setNewTabCustomName(event.target.value);
              }}
              placeholder="未設定時は自動生成"
              maxLength={60}
            />
          </div>
        </Flex>
      </Modal>
    </PageContainer>
  );
}
