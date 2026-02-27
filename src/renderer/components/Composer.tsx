import { useEffect, useMemo, useState } from 'react';
import { App, Avatar, Button, Dropdown, Input, Select, Typography } from 'antd';
import styled from 'styled-components';
import type { Account, PostVisibility } from '../../shared/types.ts';

const { TextArea } = Input;
const { Text } = Typography;

interface ComposerReplyDraft {
  serverUrl: string;
  username: string;
  inReplyToId: string;
  mentionAcct: string;
}

interface ComposerProps {
  accounts: Account[];
  replyDraft: ComposerReplyDraft | null;
  onClearReplyDraft: () => void;
}

const Container = styled.div`
  border-bottom: 1px solid #f0f0f0;
  padding: 12px 16px;
  background: #fff;
`;

const ReplyBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #d6e4ff;
  background: #f0f5ff;
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 8px;
`;

const ComposerBody = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const ComposerRight = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 8px;
  align-items: stretch;
`;

const ActionColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
`;

const visibilityOptions: { value: PostVisibility; label: string }[] = [
  { value: 'public', label: '公開' },
  { value: 'unlisted', label: '未収載' },
  { value: 'private', label: 'フォロワー限定' },
  { value: 'direct', label: 'ダイレクト' },
];

export function Composer({
  accounts,
  replyDraft,
  onClearReplyDraft,
}: ComposerProps): React.JSX.Element {
  const { message } = App.useApp();
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]);
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!replyDraft) {
      return;
    }

    const replyAccount = accounts.find(
      (account) =>
        account.serverUrl === replyDraft.serverUrl && account.username === replyDraft.username,
    );

    if (replyAccount) {
      setSelectedAccount(replyAccount);
    }

    const mentionPrefix = `@${replyDraft.mentionAcct} `;
    setText((prev) => (prev.startsWith(mentionPrefix) ? prev : `${mentionPrefix}${prev}`));
  }, [accounts, replyDraft]);

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
        inReplyToId: replyDraft?.inReplyToId,
      });
      setText('');
      onClearReplyDraft();
      message.success('投稿しました');
    } catch (e) {
      message.error(`投稿に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      {replyDraft && (
        <ReplyBanner>
          <Text>@{replyDraft.mentionAcct} への返信</Text>
          <Button size="small" type="text" onClick={onClearReplyDraft}>
            返信を解除
          </Button>
        </ReplyBanner>
      )}
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
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="いまどうしてる？"
            autoSize={{ minRows: 2, maxRows: 6 }}
            maxLength={500}
            style={{ flex: 1 }}
          />

          <ActionColumn>
            <Select
              value={visibility}
              options={visibilityOptions}
              onChange={setVisibility}
              size="small"
              style={{ width: 140 }}
            />

            <Button
              type="primary"
              onClick={() => void handleSubmit()}
              disabled={!selectedAccount || text.trim().length === 0}
              loading={submitting}
              style={{ flex: 1 }}
            >
              トゥート
            </Button>
          </ActionColumn>
        </ComposerRight>
      </ComposerBody>
    </Container>
  );
}
