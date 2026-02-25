import { useState, useEffect, useCallback } from 'react';
import { Tabs, Modal, Select, Button, App, Flex, Typography, Spin } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { Account, Post, TabDefinition, TimelineType } from '../../shared/types.ts';
import { PostItem } from '../components/PostItem.tsx';

const { Text } = Typography;

interface TimelinePageProps {
  accounts: Account[];
  onNavigateToLogin: () => void;
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
};

function generateTabId(): string {
  return crypto.randomUUID();
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

export function TimelinePage({
  accounts,
  onNavigateToLogin,
}: TimelinePageProps): React.JSX.Element {
  const [tabs, setTabs] = useState<TabDefinition[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newTabAccount, setNewTabAccount] = useState<string>('');
  const [newTabType, setNewTabType] = useState<TimelineType>('home');

  // Initialize with a default tab if accounts exist and no tabs yet
  useEffect(() => {
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
    }
  }, [accounts, tabs.length]);

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
    setTabs((prev) => [...prev, tab]);
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
  ];

  const tabItems = [
    ...tabs.map((tab) => ({
      key: tab.id,
      label: buildTabLabel(tab, accounts),
      children: <TimelineTabContent tab={tab} accounts={accounts} />,
      closable: tabs.length > 1,
    })),
  ];

  return (
    <PageContainer>
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
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={onNavigateToLogin}
              title="アカウント管理"
              style={{ marginRight: 8 }}
            />
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
