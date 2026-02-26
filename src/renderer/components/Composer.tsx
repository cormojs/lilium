import { useMemo, useState } from 'react';
import { App, Avatar, Button, Dropdown, Input, Select } from 'antd';
import styled from 'styled-components';
import type { Account, PostVisibility } from '../../shared/types.ts';

const { TextArea } = Input;

interface ComposerProps {
  accounts: Account[];
}

const Container = styled.div`
  border-bottom: 1px solid #f0f0f0;
  padding: 12px 16px;
  background: #fff;
`;

const ComposerBody = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const ComposerRight = styled.div`
  flex: 1;
  min-width: 0;
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
        icon: <Avatar src={account.avatarUrl} size={24} shape="square" />,
        label: `@${account.username}@${new URL(account.serverUrl).host}`,
      })),
    [accounts],
  );

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
      <ComposerBody>
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
          <Avatar
            src={selectedAccount?.avatarUrl}
            size={40}
            shape="square"
            style={{ cursor: 'pointer', flexShrink: 0 }}
          />
        </Dropdown>

        <ComposerRight>
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
        </ComposerRight>
      </ComposerBody>
    </Container>
  );
}
