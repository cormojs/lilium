import { useMemo, useState } from 'react';
import { App, Button, Dropdown, Input, Select, Space, Typography } from 'antd';
import { EditOutlined, DownOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { Account, PostVisibility } from '../../shared/types.ts';

const { TextArea } = Input;
const { Text } = Typography;

interface ComposerProps {
  accounts: Account[];
}

const Container = styled.div`
  border-bottom: 1px solid #f0f0f0;
  padding: 12px 16px;
  background: #fff;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const FooterRow = styled.div`
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const visibilityOptions: { value: PostVisibility; label: string }[] = [
  { value: 'public', label: '公開' },
  { value: 'unlisted', label: '未収載' },
  { value: 'private', label: 'フォロワー限定' },
  { value: 'direct', label: 'ダイレクト' },
];

export function Composer({ accounts }: ComposerProps): React.JSX.Element {
  const { message } = App.useApp();
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]);
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [submitting, setSubmitting] = useState(false);

  const accountMenuItems = useMemo(
    () =>
      accounts.map((account) => ({
        key: `${account.serverUrl}|${account.username}`,
        label: `@${account.username}@${new URL(account.serverUrl).host}`,
      })),
    [accounts],
  );

  const selectedLabel = selectedAccount
    ? `@${selectedAccount.username}@${new URL(selectedAccount.serverUrl).host}`
    : 'アカウントを選択';

  const handleSubmit = async (): Promise<void> => {
    const trimmedText = text.trim();
    if (!selectedAccount || trimmedText.length === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await window.api.createStatus({
        serverUrl: selectedAccount.serverUrl,
        accessToken: selectedAccount.accessToken,
        status: trimmedText,
        visibility,
      });
      setText('');
      message.success('投稿しました');
    } catch (e) {
      message.error(`投稿に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <HeaderRow>
        <Dropdown
          menu={{
            items: accountMenuItems,
            onClick: ({ key }) => {
              const nextAccount = accounts.find(
                (account) => `${account.serverUrl}|${account.username}` === key,
              );
              if (nextAccount) {
                setSelectedAccount(nextAccount);
              }
            },
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<EditOutlined />}>
            <Space>
              <Text>{selectedLabel}</Text>
              <DownOutlined />
            </Space>
          </Button>
        </Dropdown>
      </HeaderRow>

      <TextArea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="いまどうしてる？"
        autoSize={{ minRows: 3, maxRows: 6 }}
        maxLength={500}
      />

      <FooterRow>
        <Select
          value={visibility}
          options={visibilityOptions}
          onChange={setVisibility}
          style={{ width: 180 }}
        />

        <Button
          type="primary"
          onClick={() => void handleSubmit()}
          disabled={!selectedAccount || text.trim().length === 0}
          loading={submitting}
        >
          トゥート
        </Button>
      </FooterRow>
    </Container>
  );
}
