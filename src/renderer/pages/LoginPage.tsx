import { useState, useEffect, useCallback } from 'react';
import { Button, Input, List, Typography, Space, App, Flex } from 'antd';
import {
  ArrowLeftOutlined,
  CopyOutlined,
  LinkOutlined,
  LoginOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import type { Account, OAuthStartLoginResult } from '../../shared/types.ts';

const { Text, Title } = Typography;

interface LoginPageProps {
  onLoginSuccess?: () => void;
  onNavigateToTimeline?: () => void;
}

const PageContainer = styled.div`
  max-width: 560px;
  margin: 0 auto;
  padding: 32px 16px;
`;

const Section = styled.section`
  margin-bottom: 24px;
`;

type LoginStep = 'idle' | 'authorizing' | 'exchanging';

export function LoginPage({
  onLoginSuccess,
  onNavigateToTimeline,
}: LoginPageProps): React.JSX.Element {
  const { message } = App.useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [serverUrl, setServerUrl] = useState('');
  const [step, setStep] = useState<LoginStep>('idle');
  const [oauthData, setOauthData] = useState<OAuthStartLoginResult | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAccounts = useCallback(async () => {
    const list = await window.api.listAccounts();
    setAccounts(list);
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleStartLogin = async (): Promise<void> => {
    if (!serverUrl.trim()) return;
    setLoading(true);
    try {
      const result = await window.api.startLogin(serverUrl.trim());
      setOauthData(result);
      setStep('authorizing');
    } catch (e) {
      message.error(`ログイン開始に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = (): void => {
    if (oauthData) {
      window.open(oauthData.authorizeUrl, '_blank');
    }
  };

  const handleCopyLink = async (): Promise<void> => {
    if (oauthData) {
      await navigator.clipboard.writeText(oauthData.authorizeUrl);
      message.success('リンクをコピーしました');
    }
  };

  const handleExchangeToken = async (): Promise<void> => {
    if (!oauthData || !authCode.trim()) return;
    setLoading(true);
    setStep('exchanging');
    try {
      await window.api.exchangeToken({
        serverUrl: serverUrl.trim(),
        clientId: oauthData.clientId,
        clientSecret: oauthData.clientSecret,
        code: authCode.trim(),
      });
      message.success('ログインしました');
      // Reset form
      setStep('idle');
      setOauthData(null);
      setAuthCode('');
      setServerUrl('');
      await loadAccounts();
      onLoginSuccess?.();
    } catch (e) {
      message.error(`ログインに失敗しました: ${e instanceof Error ? e.message : String(e)}`);
      setStep('authorizing');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccount = async (account: Account): Promise<void> => {
    await window.api.removeAccount(account.serverUrl, account.username);
    await loadAccounts();
    message.success('アカウントを削除しました');
  };

  const handleCancel = (): void => {
    setStep('idle');
    setOauthData(null);
    setAuthCode('');
  };

  return (
    <PageContainer>
      {onNavigateToTimeline && (
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onNavigateToTimeline}
          style={{ marginBottom: 8 }}
        >
          タイムラインに戻る
        </Button>
      )}
      <Title level={3}>ログイン</Title>

      {/* Account list */}
      {accounts.length > 0 && (
        <Section>
          <Title level={5}>ログイン済みアカウント</Title>
          <List
            dataSource={accounts}
            renderItem={(account) => (
              <List.Item
                actions={[
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveAccount(account)}
                  />,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <img
                      src={account.avatarUrl}
                      alt={account.username}
                      style={{ width: 40, height: 40, borderRadius: '50%' }}
                    />
                  }
                  title={account.displayName}
                  description={`@${account.username}@${new URL(account.serverUrl).host}`}
                />
              </List.Item>
            )}
          />
        </Section>
      )}

      {/* Login form */}
      <Section>
        <Title level={5}>アカウントを追加</Title>

        {step === 'idle' && (
          <Flex gap={8}>
            <Input
              placeholder="mastodon.social"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              onPressEnter={handleStartLogin}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              icon={<LoginOutlined />}
              loading={loading}
              onClick={handleStartLogin}
              disabled={!serverUrl.trim()}
            >
              ログイン開始
            </Button>
          </Flex>
        )}

        {step === 'authorizing' && oauthData && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text>以下のリンクをブラウザで開いて、アプリを認可してください。</Text>
            <Flex gap={8}>
              <Button icon={<LinkOutlined />} onClick={handleOpenLink}>
                ブラウザで開く
              </Button>
              <Button icon={<CopyOutlined />} onClick={handleCopyLink}>
                リンクをコピー
              </Button>
            </Flex>
            <Text type="secondary">認可後に表示されるコードを入力してください。</Text>
            <Flex gap={8}>
              <Input
                placeholder="認可コードを入力"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                onPressEnter={handleExchangeToken}
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                loading={loading}
                onClick={handleExchangeToken}
                disabled={!authCode.trim()}
              >
                ログイン完了
              </Button>
            </Flex>
            <Button type="link" onClick={handleCancel}>
              キャンセル
            </Button>
          </Space>
        )}

        {step === 'exchanging' && <Text>認証中...</Text>}
      </Section>
    </PageContainer>
  );
}
