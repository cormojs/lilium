import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, Modal, Select, Button, App, Flex, Typography, Spin, Dropdown, Tooltip } from 'antd';
import { SettingOutlined, UserOutlined, SwapOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type {
  Account,
  MastoNotification,
  PaneDefinition,
  Post,
  StreamConnectionStatus,
  StreamType,
  TabDefinition,
  TimelineType,
} from '../../shared/types.ts';
import { PostItem } from '../components/PostItem.tsx';
import { NotificationItem } from '../components/NotificationItem.tsx';
import { Composer } from '../components/Composer.tsx';
import { CompactPostItem } from '../components/CompactPostItem.tsx';
import { PaneContainer } from '../components/PaneContainer.tsx';

const { Text } = Typography;

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
  favourites: 'Favourites',
  notifications: 'Notifications',
};

function generateId(): string {
  return crypto.randomUUID();
}

function getStreamType(timelineType: TimelineType): StreamType | null {
  switch (timelineType) {
    case 'home':
      return 'user';
    case 'public':
      return 'public';
    default:
      return null;
  }
}

function buildTabLabel(tab: TabDefinition, accounts: Account[]): string {
  const account = accounts.find(
    (a) => a.serverUrl === tab.accountServerUrl && a.username === tab.accountUsername,
  );
  const acct = account ? `@${account.username}@${new URL(account.serverUrl).host}` : '?';
  return `${TIMELINE_TYPE_LABELS[tab.timelineType]} ${acct}`;
}

function TimelineTabContent({
  tab,
  accounts,
}: {
  tab: TabDefinition;
  accounts: Account[];
}): React.JSX.Element {
  const { message } = App.useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const postsRef = useRef(posts);
  postsRef.current = posts;
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const account = accounts.find(
    (a) => a.serverUrl === tab.accountServerUrl && a.username === tab.accountUsername,
  );

  const loadTimeline = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    hasMoreRef.current = true;
    try {
      const result = await window.api.fetchTimeline({
        serverUrl: account.serverUrl,
        accessToken: account.accessToken,
        type: tab.timelineType,
      });
      setPosts(result);
    } catch (e) {
      message.error(
        `タイムラインの取得に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setLoading(false);
    }
  }, [account, tab.timelineType, message]);

  const loadMore = useCallback(async () => {
    if (!account || loadingMoreRef.current || !hasMoreRef.current) return;
    const currentPosts = postsRef.current;
    if (currentPosts.length === 0) return;
    const lastPost = currentPosts[currentPosts.length - 1];
    if (!lastPost) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await window.api.fetchTimeline({
        serverUrl: account.serverUrl,
        accessToken: account.accessToken,
        type: tab.timelineType,
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
  }, [account, tab.timelineType, message]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const checkAndLoad = (): void => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        void loadMore();
      }
    };
    checkAndLoad();
    el.addEventListener('scroll', checkAndLoad);
    return () => el.removeEventListener('scroll', checkAndLoad);
  }, [loadMore, posts.length]);

  // Subscribe to streaming for real-time updates
  useEffect(() => {
    if (!account) return;
    const streamType = getStreamType(tab.timelineType);
    if (!streamType) return;

    const subscriptionId = `timeline-${tab.id}`;
    window.api.subscribeStream({
      serverUrl: account.serverUrl,
      accessToken: account.accessToken,
      streamType,
      subscriptionId,
    });

    const removeListener = window.api.onStreamEvent((event) => {
      if (event.subscriptionId !== subscriptionId) return;
      if (event.event === 'update') {
        const post = event.payload as Post;
        setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [post, ...prev]));
      } else if (event.event === 'delete') {
        setPosts((prev) => prev.filter((p) => p.id !== event.payload));
      }
    });

    return () => {
      removeListener();
      window.api.unsubscribeStream(subscriptionId);
    };
  }, [account, tab.id, tab.timelineType]);

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

  if (posts.length === 0) {
    return <EmptyMessage>投稿がありません</EmptyMessage>;
  }

  return (
    <TimelineList ref={listRef}>
      {posts.map((post) =>
        expandedPostId === post.id ? (
          <PostItem
            key={post.id}
            post={post}
            serverUrl={account.serverUrl}
            accessToken={account.accessToken}
            onCollapse={() => setExpandedPostId(null)}
          />
        ) : (
          <CompactPostItem key={post.id} post={post} onClick={() => setExpandedPostId(post.id)} />
        ),
      )}
      {loadingMore && (
        <SpinContainer>
          <Spin size="small" />
        </SpinContainer>
      )}
    </TimelineList>
  );
}

function NotificationTabContent({
  tab,
  accounts,
}: {
  tab: TabDefinition;
  accounts: Account[];
}): React.JSX.Element {
  const { message } = App.useApp();
  const [notifications, setNotifications] = useState<MastoNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const account = accounts.find(
    (a) => a.serverUrl === tab.accountServerUrl && a.username === tab.accountUsername,
  );

  const loadNotifications = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    hasMoreRef.current = true;
    try {
      const result = await window.api.fetchNotifications({
        serverUrl: account.serverUrl,
        accessToken: account.accessToken,
      });
      setNotifications(result);
    } catch (e) {
      message.error(`通知の取得に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [account, message]);

  const loadMoreNotifications = useCallback(async () => {
    if (!account || loadingMoreRef.current || !hasMoreRef.current) return;
    const currentNotifications = notificationsRef.current;
    if (currentNotifications.length === 0) return;
    const lastNotification = currentNotifications[currentNotifications.length - 1];
    if (!lastNotification) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await window.api.fetchNotifications({
        serverUrl: account.serverUrl,
        accessToken: account.accessToken,
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
  }, [account, message]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const checkAndLoad = (): void => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        void loadMoreNotifications();
      }
    };
    checkAndLoad();
    el.addEventListener('scroll', checkAndLoad);
    return () => el.removeEventListener('scroll', checkAndLoad);
  }, [loadMoreNotifications, notifications.length]);

  // Subscribe to user stream for real-time notification updates
  useEffect(() => {
    if (!account) return;

    const subscriptionId = `notifications-${tab.id}`;
    window.api.subscribeStream({
      serverUrl: account.serverUrl,
      accessToken: account.accessToken,
      streamType: 'user',
      subscriptionId,
    });

    const removeListener = window.api.onStreamEvent((event) => {
      if (event.subscriptionId !== subscriptionId) return;
      if (event.event === 'notification') {
        const notification = event.payload as MastoNotification;
        setNotifications((prev) =>
          prev.some((n) => n.id === notification.id) ? prev : [notification, ...prev],
        );
      }
    });

    return () => {
      removeListener();
      window.api.unsubscribeStream(subscriptionId);
    };
  }, [account, tab.id]);

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
        <NotificationItem key={notification.id} notification={notification} />
      ))}
      {loadingMore && (
        <SpinContainer>
          <Spin size="small" />
        </SpinContainer>
      )}
    </TimelineList>
  );
}

function TabContent({
  tab,
  accounts,
}: {
  tab: TabDefinition;
  accounts: Account[];
}): React.JSX.Element {
  if (tab.timelineType === 'notifications') {
    return <NotificationTabContent tab={tab} accounts={accounts} />;
  }
  return <TimelineTabContent tab={tab} accounts={accounts} />;
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
}: PaneProps): React.JSX.Element {
  const [connectionStatuses, setConnectionStatuses] = useState<
    Record<string, StreamConnectionStatus>
  >({});

  useEffect(() => {
    const removeListener = window.api.onStreamConnectionStatus((data) => {
      setConnectionStatuses((prev) => ({
        ...prev,
        [data.subscriptionId]: data.status,
      }));
    });
    return removeListener;
  }, []);

  const paneTabs = pane.tabIds
    .map((id) => tabs.find((t) => t.id === id))
    .filter((t): t is TabDefinition => t !== undefined);

  const tabItems = paneTabs.map((tab) => {
    const moveMenuItems = [];
    if (paneIndex > 0 || totalPanes > 1) {
      moveMenuItems.push({
        key: 'left',
        label: '左のペインへ移動',
        disabled: paneIndex === 0,
      });
    }
    if (paneIndex < totalPanes - 1 || totalPanes > 1) {
      moveMenuItems.push({
        key: 'right',
        label: '右のペインへ移動',
        disabled: paneIndex === totalPanes - 1,
      });
    }

    return {
      key: tab.id,
      label: (
        <TabLabelWrapper>
          {totalPanes > 1 && (
            <Dropdown
              menu={{
                items: moveMenuItems,
                onClick: ({ key }) => {
                  onMoveTab(tab.id, pane.id, key as 'left' | 'right');
                },
              }}
              trigger={['click']}
            >
              <SwapOutlined
                style={{ fontSize: 10, cursor: 'pointer' }}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          )}
          {buildTabLabel(tab, accounts)}
          {(() => {
            const subIds = getSubscriptionIds(tab);
            const status = subIds.length > 0 ? connectionStatuses[subIds[0]] : undefined;
            if (!status) return null;
            return (
              <Tooltip title={CONNECTION_STATUS_LABELS[status]}>
                <StatusDot $color={CONNECTION_STATUS_COLORS[status]} />
              </Tooltip>
            );
          })()}
        </TabLabelWrapper>
      ),
      children: <TabContent tab={tab} accounts={accounts} />,
      closable: paneTabs.length > 1 || totalPanes > 1,
    };
  });

  return (
    <StyledTabs
      type="editable-card"
      activeKey={pane.activeTabId}
      onChange={(key) => onActiveTabChange(pane.id, key)}
      onEdit={(targetKey, action) => {
        if (action === 'add') {
          onAddTab(pane.id);
        } else if (action === 'remove' && typeof targetKey === 'string') {
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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPaneId, setModalPaneId] = useState<string>('');
  const [newTabAccount, setNewTabAccount] = useState<string>('');
  const [newTabType, setNewTabType] = useState<TimelineType>('home');

  // Load saved data on mount
  useEffect(() => {
    Promise.all([window.api.listTabs(), window.api.loadPaneLayout()]).then(
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
      window.api.saveTabs([defaultTab]);
      window.api.savePaneLayout({ panes: [defaultPane] });
    }
  }, [accounts, tabs.length, loaded]);

  const persistLayout = useCallback((newTabs: TabDefinition[], newPanes: PaneDefinition[]) => {
    window.api.saveTabs(newTabs);
    window.api.savePaneLayout({ panes: newPanes });
  }, []);

  const handleActiveTabChange = useCallback((paneId: string, tabId: string) => {
    setPanes((prev) => {
      const next = prev.map((p) => (p.id === paneId ? { ...p, activeTabId: tabId } : p));
      window.api.savePaneLayout({ panes: next });
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
  }, [newTabAccount, newTabType, modalPaneId, persistLayout]);

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

        const fromPane = prevPanes[fromIndex]!;
        const toPane = prevPanes[toIndex]!;

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

        window.api.savePaneLayout({ panes: nextPanes });
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
      window.api.savePaneLayout({ panes: nextPanes });
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
      window.api.savePaneLayout({ panes: normalizedPanes });
      return normalizedPanes;
    });
  }, []);

  const accountOptions = accounts.map((a) => ({
    value: `${a.serverUrl}|${a.username}`,
    label: `@${a.username}@${new URL(a.serverUrl).host}`,
  }));

  const timelineTypeOptions: { value: TimelineType; label: string }[] = [
    { value: 'home', label: 'Home' },
    { value: 'public', label: 'Public' },
    { value: 'favourites', label: 'Favourites' },
    { value: 'notifications', label: 'Notifications' },
  ];

  const widthRatios = panes.map((p) => p.widthRatio);

  return (
    <PageContainer>
      <Flex align="flex-start" style={{ flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Composer accounts={accounts} />
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
          />
        ))}
      </PaneContainer>

      <Modal
        title="タブを追加"
        open={modalOpen}
        onOk={handleConfirmAddTab}
        onCancel={() => setModalOpen(false)}
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
              options={timelineTypeOptions}
            />
          </div>
        </Flex>
      </Modal>
    </PageContainer>
  );
}
