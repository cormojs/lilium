import { useMemo, useRef, useState } from 'react';
import { App, Avatar, Button, Dropdown, Input, Select, Switch, Typography } from 'antd';
import styled from 'styled-components';
import type {
  Account,
  MediaAttachmentType,
  PostVisibility,
  UploadedMedia,
} from '../../shared/types.ts';

const { TextArea } = Input;
const { Text } = Typography;
const MAX_MEDIA_ATTACHMENTS = 4;

export interface ComposerStatusDraft {
  type: 'reply' | 'quote';
  serverUrl: string;
  username: string;
  postId: string;
  acct: string;
}

interface ComposerProps {
  accounts: Account[];
  statusDraft: ComposerStatusDraft | null;
  onClearStatusDraft: () => void;
}

const Container = styled.div<{ $dragOver: boolean }>`
  border-bottom: 1px solid #f0f0f0;
  padding: 12px 16px;
  background: ${(props) => (props.$dragOver ? '#f0f7ff' : '#fff')};
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

const MediaPreviewVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #000;
`;

const MediaPreviewLabel = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  color: #4b5563;
  font-size: 12px;
  text-align: center;
  overflow-wrap: anywhere;
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

const ActionRow = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const visibilityOptions: { value: PostVisibility; label: string }[] = [
  { value: 'public', label: '公開' },
  { value: 'unlisted', label: '未収載' },
  { value: 'private', label: 'フォロワー限定' },
  { value: 'direct', label: 'ダイレクト' },
];

function accountKey(account: Account): string {
  return `${account.serverUrl}|${account.username}`;
}

function getMediaTypeFromMimeType(mimeType: string): MediaAttachmentType | null {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }

  return null;
}

function getMediaLabel(type: MediaAttachmentType): string {
  switch (type) {
    case 'image':
      return '画像';
    case 'video':
    case 'gifv':
      return '動画';
    case 'audio':
      return '音声';
    case 'unknown':
      return 'メディア';
  }
}

function getPosterUrl(media: UploadedMedia): string | undefined {
  return media.previewUrl !== media.url ? media.previewUrl : undefined;
}

export function Composer({
  accounts,
  statusDraft,
  onClearStatusDraft,
}: ComposerProps): React.JSX.Element {
  const { message } = App.useApp();
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [useContentWarning, setUseContentWarning] = useState(false);
  const [spoilerText, setSpoilerText] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [mediaAttachments, setMediaAttachments] = useState<UploadedMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const draftAccount = statusDraft
    ? accounts.find(
        (account) =>
          account.serverUrl === statusDraft.serverUrl && account.username === statusDraft.username,
      )
    : undefined;
  const manuallySelectedAccount = selectedAccountKey
    ? accounts.find((account) => accountKey(account) === selectedAccountKey)
    : undefined;
  const selectedAccount = draftAccount ?? manuallySelectedAccount ?? accounts[0];

  const accountMenuItems = useMemo(
    () =>
      accounts.map((account) => ({
        key: accountKey(account),
        icon: <Avatar src={account.avatarUrl} size={24} shape="square" />,
        label: `@${account.username}@${new URL(account.serverUrl).host}`,
      })),
    [accounts],
  );

  const uploadFiles = async (files: File[]): Promise<void> => {
    if (!selectedAccount || files.length === 0) {
      return;
    }

    const supportedFiles = files
      .map((file) => ({ file, type: getMediaTypeFromMimeType(file.type) }))
      .filter((item): item is { file: File; type: MediaAttachmentType } => item.type !== null);
    if (supportedFiles.length === 0) {
      message.warning('画像・動画・音声ファイルを添付できます');
      return;
    }

    if (supportedFiles.length < files.length) {
      message.warning('未対応のファイルは添付しませんでした');
    }

    const hasExistingNonImage = mediaAttachments.some((media) => media.type !== 'image');
    const includesNonImage = supportedFiles.some((item) => item.type !== 'image');
    if (
      (hasExistingNonImage || includesNonImage) &&
      mediaAttachments.length + supportedFiles.length > 1
    ) {
      message.warning('動画・音声は1件だけ添付できます');
      return;
    }

    if (
      mediaAttachments.some((media) => media.type !== 'image') &&
      supportedFiles.some((item) => item.type === 'image')
    ) {
      message.warning('動画・音声と画像は同時に添付できません');
      return;
    }

    const remainingSlots = MAX_MEDIA_ATTACHMENTS - mediaAttachments.length;
    if (remainingSlots <= 0) {
      message.warning(`メディアは最大${MAX_MEDIA_ATTACHMENTS}件まで添付できます`);
      return;
    }

    const targetFiles = supportedFiles.slice(0, remainingSlots);
    if (supportedFiles.length > targetFiles.length) {
      message.warning(`画像は最大${MAX_MEDIA_ATTACHMENTS}枚まで添付できます`);
    }

    setUploadingCount((count) => count + targetFiles.length);
    try {
      for (const { file } of targetFiles) {
        const data = new Uint8Array(await file.arrayBuffer());
        const uploaded = await window.api.uploadMedia({
          serverUrl: selectedAccount.serverUrl,
          username: selectedAccount.username,
          fileName: file.name,
          mimeType: file.type,
          data,
        });
        setMediaAttachments((current) => [...current, uploaded]);
      }
    } catch (e) {
      message.error(
        `メディアアップロードに失敗しました: ${e instanceof Error ? e.message : String(e)}`,
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
      const mentionPrefix = statusDraft?.type === 'reply' ? `@${statusDraft.acct} ` : undefined;
      const statusText =
        mentionPrefix && !trimmedText.startsWith(mentionPrefix)
          ? `${mentionPrefix}${trimmedText}`
          : trimmedText;

      await window.api.createStatus({
        serverUrl: selectedAccount.serverUrl,
        username: selectedAccount.username,
        status: statusText,
        spoilerText: useContentWarning ? spoilerText.trim() : undefined,
        visibility,
        inReplyToId: statusDraft?.type === 'reply' ? statusDraft.postId : undefined,
        quotedStatusId: statusDraft?.type === 'quote' ? statusDraft.postId : undefined,
        mediaIds: mediaAttachments.map((media) => media.id),
      });
      setText('');
      setUseContentWarning(false);
      setSpoilerText('');
      setMediaAttachments([]);
      onClearStatusDraft();
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
      {statusDraft && (
        <ReplyBanner>
          <Text>
            @{statusDraft.acct}
            {statusDraft.type === 'reply' ? ' への返信' : ' を引用'}
          </Text>
          <Button size="small" type="text" onClick={onClearStatusDraft}>
            {statusDraft.type === 'reply' ? '返信を解除' : '引用を解除'}
          </Button>
        </ReplyBanner>
      )}
      <ComposerBody>
        <Dropdown
          menu={{
            items: accountMenuItems,
            onClick: ({ key }) => {
              const nextAccount = accounts.find((account) => accountKey(account) === key);
              if (nextAccount) {
                setSelectedAccountKey(accountKey(nextAccount));
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
            <Input
              value={spoilerText}
              onChange={(event) => setSpoilerText(event.target.value)}
              placeholder="内容の警告 (CW)"
              maxLength={100}
              style={{ display: useContentWarning ? 'block' : 'none' }}
            />
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
                    {media.type === 'image' ? (
                      <img
                        src={media.previewUrl || media.url}
                        alt={media.description ?? '添付画像'}
                      />
                    ) : media.type === 'video' || media.type === 'gifv' ? (
                      <MediaPreviewVideo
                        src={media.url}
                        poster={getPosterUrl(media)}
                        muted
                        aria-label={media.description ?? '添付動画'}
                      />
                    ) : (
                      <MediaPreviewLabel>{getMediaLabel(media.type)}</MediaPreviewLabel>
                    )}
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
            <ActionRow>
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingCount > 0}>
                メディア
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                style={{ display: 'none' }}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  void uploadFiles(files);
                  event.currentTarget.value = '';
                }}
              />
              <Switch
                checked={useContentWarning}
                checkedChildren="CW ON"
                unCheckedChildren="CW"
                onChange={(checked) => {
                  setUseContentWarning(checked);
                  if (!checked) {
                    setSpoilerText('');
                  }
                }}
              />
            </ActionRow>
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
