import { useState, useEffect, useCallback } from 'react';
import { Tabs, Modal, Select, Button, App, Flex, Typography, Spin } from 'antd';
import { SettingOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type {
  Account,
  MastoNotification,
  Post,
  StreamType,
  TabDefinition,
  TimelineType,
} from '../../shared/types.ts';
import { PostItem } from '../components/PostItem.tsx';
import { NotificationItem } from '../components/NotificationItem.tsx';
import { Composer } from '../components/Composer.tsx';

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

const TIMELINE_TYPE_LABELS: Record<TimelineType, string> = {
  home: 'Home',
  public: 'Public',
  favourites: 'Favourites',
  notifications: 'Notifications',
};

function generateTabId(): string {
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

  const account = accounts.find(
    (a) => a.serverUrl === tab.accountServerUrl && a.username === tab.accountUsername,
  );

  const loadTimeline = useCallback(async () => {
    if (!account) return;
    setLoading(true);
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

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

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
        setPosts((prev) => [event.payload as Post, ...prev]);
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
    <TimelineList>
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
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

  const account = accounts.find(
    (a) => a.serverUrl === tab.accountServerUrl && a.username === tab.accountUsername,
  );

  const loadNotifications = useCallback(async () => {
    if (!account) return;
    setLoading(true);
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

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

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
        setNotifications((prev) => [event.payload as MastoNotification, ...prev]);
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
    <TimelineList>
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
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

export function TimelinePage({
  accounts,
  onNavigateToLogin,
  onNavigateToSettings,
}: TimelinePageProps): React.JSX.Element {
  const [tabs, setTabs] = useState<TabDefinition[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newTabAccount, setNewTabAccount] = useState<string>('');
  const [newTabType, setNewTabType] = useState<TimelineType>('home');
  const [tabsLoaded, setTabsLoaded] = useState(false);

  // Load saved tabs on mount
  useEffect(() => {
    window.api.listTabs().then((savedTabs) => {
      if (savedTabs.length > 0) {
        setTabs(savedTabs);
        setActiveTabId(savedTabs[0]?.id ?? '');
      }
      setTabsLoaded(true);
    });
  }, []);

  // Initialize with a default tab if accounts exist and no saved tabs
  useEffect(() => {
    if (!tabsLoaded) return;
    const firstAccount = accounts[0];
    if (firstAccount && tabs.length === 0) {
      const defaultTab: TabDefinition = {
        id: generateTabId(),
        accountServerUrl: firstAccount.serverUrl,
        accountUsername: firstAccount.username,
        timelineType: 'home',
      };
      setTabs([defaultTab]);
      setActiveTabId(defaultTab.id);
      window.api.saveTabs([defaultTab]);
    }
  }, [accounts, tabs.length, tabsLoaded]);

  const handleAddTab = (): void => {
    if (!newTabAccount) return;
    const parts = newTabAccount.split('|');
    const serverUrl = parts[0] ?? '';
    const username = parts[1] ?? '';
    const tab: TabDefinition = {
      id: generateTabId(),
      accountServerUrl: serverUrl,
      accountUsername: username,
      timelineType: newTabType,
    };
    setTabs((prev) => {
      const next = [...prev, tab];
      window.api.saveTabs(next);
      return next;
    });
    setActiveTabId(tab.id);
    setModalOpen(false);
    setNewTabAccount('');
    setNewTabType('home');
  };

  const handleRemoveTab = (tabId: string): void => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      const firstRemaining = next[0];
      if (activeTabId === tabId && firstRemaining) {
        setActiveTabId(firstRemaining.id);
      }
      window.api.saveTabs(next);
      return next;
    });
  };

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

  const tabItems = [
    ...tabs.map((tab) => ({
      key: tab.id,
      label: buildTabLabel(tab, accounts),
      children: <TabContent tab={tab} accounts={accounts} />,
      closable: tabs.length > 1,
    })),
  ];

  return (
    <PageContainer>
      <Composer accounts={accounts} />
      <Tabs
        type="editable-card"
        activeKey={activeTabId}
        onChange={setActiveTabId}
        onEdit={(targetKey, action) => {
          if (action === 'add') {
            const firstOption = accountOptions[0];
            if (firstOption) {
              setNewTabAccount(firstOption.value);
            }
            setModalOpen(true);
          } else if (action === 'remove' && typeof targetKey === 'string') {
            handleRemoveTab(targetKey);
          }
        }}
        items={tabItems}
        tabBarExtraContent={{
          right: (
            <>
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={onNavigateToSettings}
                title="設定"
                style={{ marginRight: 4 }}
              />
              <Button
                type="text"
                icon={<UserOutlined />}
                onClick={onNavigateToLogin}
                title="アカウント管理"
                style={{ marginRight: 8 }}
              />
            </>
          ),
        }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      />

      <Modal
        title="タブを追加"
        open={modalOpen}
        onOk={handleAddTab}
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
