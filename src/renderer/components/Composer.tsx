import { useEffect, useMemo, useRef, useState } from 'react';
import { App, Avatar, Button, Dropdown, Input, Select, Spin, Switch, Typography } from 'antd';
import styled from 'styled-components';
import type {
  Account,
  AccountSuggestion,
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
  container: composer / inline-size;
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

  @container composer (max-width: 600px) {
    flex-direction: column;
  }
`;

const InputColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TextAreaWrapper = styled.div`
  position: relative;
  display: flex;
`;

const SuggestionPanel = styled.div`
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 6px 16px rgb(0 0 0 / 12%);
  overflow: hidden;
`;

const SuggestionLoading = styled.div`
  padding: 10px;
  text-align: center;
`;

const SuggestionButton = styled.button<{ $active: boolean }>`
  width: 100%;
  border: 0;
  background: ${(props) => (props.$active ? '#e6f4ff' : '#fff')};
  padding: 8px 10px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: #e6f4ff;
  }
`;

const SuggestionName = styled.div`
  color: #111827;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SuggestionAcct = styled.div`
  color: #6b7280;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

  @container composer (max-width: 600px) {
    flex-direction: row;
    align-items: stretch;
  }
`;

const ActionRow = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
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

interface ActiveMention {
  start: number;
  end: number;
  query: string;
}

interface SuggestionState {
  items: AccountSuggestion[];
  loading: boolean;
  activeIndex: number;
}

function findActiveMention(value: string, caretPosition: number | null): ActiveMention | null {
  if (caretPosition === null) {
    return null;
  }

  const beforeCaret = value.slice(0, caretPosition);
  const mentionStart = beforeCaret.lastIndexOf('@');
  if (mentionStart === -1) {
    return null;
  }

  const previousCharacter = mentionStart > 0 ? beforeCaret[mentionStart - 1] : '';
  if (previousCharacter && !/\s/.test(previousCharacter)) {
    return null;
  }

  const query = beforeCaret.slice(mentionStart + 1);
  if (/\s/.test(query)) {
    return null;
  }

  return {
    start: mentionStart,
    end: caretPosition,
    query,
  };
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
  const [activeMention, setActiveMention] = useState<ActiveMention | null>(null);
  const [suggestionState, setSuggestionState] = useState<SuggestionState>({
    items: [],
    loading: false,
    activeIndex: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<React.ComponentRef<typeof TextArea>>(null);
  const suggestionRequestIdRef = useRef(0);

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

  function updateActiveMention(value: string, caretPosition: number | null): void {
    const nextMention = findActiveMention(value, caretPosition);
    setActiveMention(nextMention);
    setSuggestionState({
      items: [],
      loading: nextMention !== null,
      activeIndex: 0,
    });
  }

  useEffect(() => {
    if (!selectedAccount || !activeMention) {
      suggestionRequestIdRef.current += 1;
      return;
    }

    const requestId = suggestionRequestIdRef.current + 1;
    suggestionRequestIdRef.current = requestId;

    const timeoutId = window.setTimeout(() => {
      void window.api
        .fetchAccountSuggestions({
          serverUrl: selectedAccount.serverUrl,
          username: selectedAccount.username,
          query: activeMention.query,
        })
        .then((nextSuggestions) => {
          if (suggestionRequestIdRef.current !== requestId) {
            return;
          }
          setSuggestionState({ items: nextSuggestions, loading: false, activeIndex: 0 });
        })
        .catch((e: unknown) => {
          if (suggestionRequestIdRef.current !== requestId) {
            return;
          }
          setSuggestionState({ items: [], loading: false, activeIndex: 0 });
          message.error(
            `acct補完候補の取得に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
          );
        });
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeMention, message, selectedAccount]);

  function insertSuggestion(suggestion: AccountSuggestion): void {
    if (!activeMention) {
      return;
    }

    const replacement = `@${suggestion.acct} `;
    const nextText =
      text.slice(0, activeMention.start) + replacement + text.slice(activeMention.end);
    const nextCaretPosition = activeMention.start + replacement.length;
    setText(nextText);
    setActiveMention(null);
    setSuggestionState({ items: [], loading: false, activeIndex: 0 });

    window.setTimeout(() => {
      textAreaRef.current?.focus();
      const textArea = textAreaRef.current?.resizableTextArea?.textArea;
      textArea?.setSelectionRange(nextCaretPosition, nextCaretPosition);
    }, 0);
  }

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
      message.warning(`メディアは最大${String(MAX_MEDIA_ATTACHMENTS)}件まで添付できます`);
      return;
    }

    const targetFiles = supportedFiles.slice(0, remainingSlots);
    if (supportedFiles.length > targetFiles.length) {
      message.warning(`画像は最大${String(MAX_MEDIA_ATTACHMENTS)}枚まで添付できます`);
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

  const suggestionPanelOpen =
    activeMention !== null && (suggestionState.loading || suggestionState.items.length > 0);

  return (
    <Container
      $dragOver={isDragOver}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
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
                setActiveMention(null);
                setSuggestionState({ items: [], loading: false, activeIndex: 0 });
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
              onChange={(event) => {
                setSpoilerText(event.target.value);
              }}
              placeholder="内容の警告 (CW)"
              maxLength={100}
              style={{ display: useContentWarning ? 'block' : 'none' }}
            />
            <TextAreaWrapper>
              <TextArea
                ref={textAreaRef}
                value={text}
                onChange={(event) => {
                  const nextText = event.target.value;
                  setText(nextText);
                  updateActiveMention(nextText, event.target.selectionStart);
                }}
                onClick={(event) => {
                  updateActiveMention(text, event.currentTarget.selectionStart);
                }}
                onPaste={(event) => {
                  const clipboardFiles = Array.from(event.clipboardData.files);
                  if (clipboardFiles.length === 0) {
                    return;
                  }
                  event.preventDefault();
                  void uploadFiles(clipboardFiles);
                }}
                onKeyDown={(event) => {
                  if (suggestionPanelOpen && suggestionState.items.length > 0) {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setSuggestionState((current) => ({
                        ...current,
                        activeIndex: (current.activeIndex + 1) % current.items.length,
                      }));
                      return;
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setSuggestionState((current) => ({
                        ...current,
                        activeIndex:
                          (current.activeIndex - 1 + current.items.length) % current.items.length,
                      }));
                      return;
                    }
                    if (
                      (event.key === 'Enter' || event.key === 'Tab') &&
                      suggestionState.items.length > 0
                    ) {
                      event.preventDefault();
                      const suggestion = suggestionState.items[suggestionState.activeIndex];
                      if (suggestion) {
                        insertSuggestion(suggestion);
                      }
                      return;
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setActiveMention(null);
                      setSuggestionState({ items: [], loading: false, activeIndex: 0 });
                      return;
                    }
                  }
                  if (suggestionPanelOpen && event.key === 'Escape') {
                    event.preventDefault();
                    setActiveMention(null);
                    setSuggestionState({ items: [], loading: false, activeIndex: 0 });
                    return;
                  }

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
              {suggestionPanelOpen && (
                <SuggestionPanel>
                  {suggestionState.loading && suggestionState.items.length === 0 ? (
                    <SuggestionLoading>
                      <Spin size="small" />
                    </SuggestionLoading>
                  ) : (
                    suggestionState.items.map((suggestion, index) => {
                      const displayName =
                        suggestion.displayName.trim().length > 0
                          ? suggestion.displayName
                          : suggestion.acct;
                      return (
                        <SuggestionButton
                          key={suggestion.id}
                          $active={index === suggestionState.activeIndex}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            insertSuggestion(suggestion);
                          }}
                        >
                          <Avatar src={suggestion.avatarUrl} size={28} shape="square" />
                          <div>
                            <SuggestionName>{displayName}</SuggestionName>
                            <SuggestionAcct>@{suggestion.acct}</SuggestionAcct>
                          </div>
                        </SuggestionButton>
                      );
                    })
                  )}
                </SuggestionPanel>
              )}
            </TextAreaWrapper>

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
