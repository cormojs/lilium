import { useMemo, useRef, useState } from 'react';
import { App, Avatar, Button, Dropdown, Input, Select } from 'antd';
import styled from 'styled-components';
import type { Account, PostVisibility, UploadedMedia } from '../../shared/types.ts';

const { TextArea } = Input;
const MAX_MEDIA_ATTACHMENTS = 4;

interface ComposerProps {
  accounts: Account[];
}

const Container = styled.div<{ $dragOver: boolean }>`
  border-bottom: 1px solid #f0f0f0;
  padding: 12px 16px;
  background: ${(props) => (props.$dragOver ? '#f0f7ff' : '#fff')};
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

const InputColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, 80px);
  gap: 8px;
`;

const MediaThumb = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #f5f5f5;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const RemoveMediaButton = styled(Button)`
  position: absolute;
  top: 4px;
  right: 4px;
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

export function Composer({ accounts }: ComposerProps): React.JSX.Element {
  const { message } = App.useApp();
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]);
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [mediaAttachments, setMediaAttachments] = useState<UploadedMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accountMenuItems = useMemo(
    () =>
      accounts.map((account) => ({
        key: `${account.serverUrl}|${account.username}`,
        icon: <Avatar src={account.avatarUrl} size={24} shape="square" />,
        label: `@${account.username}@${new URL(account.serverUrl).host}`,
      })),
    [accounts],
  );

  const uploadFiles = async (files: File[]): Promise<void> => {
    if (!selectedAccount || files.length === 0) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      message.warning('画像ファイルのみ添付できます');
      return;
    }

    const remainingSlots = MAX_MEDIA_ATTACHMENTS - mediaAttachments.length;
    if (remainingSlots <= 0) {
      message.warning(`画像は最大${MAX_MEDIA_ATTACHMENTS}枚まで添付できます`);
      return;
    }

    const targetFiles = imageFiles.slice(0, remainingSlots);
    if (imageFiles.length > targetFiles.length) {
      message.warning(`画像は最大${MAX_MEDIA_ATTACHMENTS}枚まで添付できます`);
    }

    setUploadingCount((count) => count + targetFiles.length);
    try {
      for (const file of targetFiles) {
        const data = new Uint8Array(await file.arrayBuffer());
        const uploaded = await window.api.uploadMedia({
          serverUrl: selectedAccount.serverUrl,
          accessToken: selectedAccount.accessToken,
          fileName: file.name,
          mimeType: file.type,
          data,
        });
        setMediaAttachments((current) => [...current, uploaded]);
      }
    } catch (e) {
      message.error(
        `画像アップロードに失敗しました: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setUploadingCount((count) => count - targetFiles.length);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    const trimmedText = text.trim();
    if (
      !selectedAccount ||
      (trimmedText.length === 0 && mediaAttachments.length === 0) ||
      submitting ||
      uploadingCount > 0
    ) {
      return;
    }

    setSubmitting(true);
    try {
      await window.api.createStatus({
        serverUrl: selectedAccount.serverUrl,
        accessToken: selectedAccount.accessToken,
        status: trimmedText,
        visibility,
        mediaIds: mediaAttachments.map((media) => media.id),
      });
      setText('');
      setMediaAttachments([]);
      message.success('投稿しました');
    } catch (e) {
      message.error(`投稿に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container
      $dragOver={isDragOver}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        void uploadFiles(Array.from(event.dataTransfer.files));
      }}
    >
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
                setMediaAttachments([]);
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
          <InputColumn>
            <TextArea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onPaste={(event) => {
                const clipboardFiles = Array.from(event.clipboardData.files);
                if (clipboardFiles.length === 0) {
                  return;
                }
                event.preventDefault();
                void uploadFiles(clipboardFiles);
              }}
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

            {mediaAttachments.length > 0 && (
              <MediaGrid>
                {mediaAttachments.map((media) => (
                  <MediaThumb key={media.id}>
                    <img src={media.previewUrl || media.url} alt="添付画像プレビュー" />
                    <RemoveMediaButton
                      danger
                      size="small"
                      onClick={() => {
                        setMediaAttachments((current) =>
                          current.filter((item) => item.id !== media.id),
                        );
                      }}
                    >
                      削除
                    </RemoveMediaButton>
                  </MediaThumb>
                ))}
              </MediaGrid>
            )}
          </InputColumn>

          <ActionColumn>
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingCount > 0}>
              画像
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                void uploadFiles(files);
                event.currentTarget.value = '';
              }}
            />
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
              disabled={
                !selectedAccount || (text.trim().length === 0 && mediaAttachments.length === 0)
              }
              loading={submitting || uploadingCount > 0}
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
