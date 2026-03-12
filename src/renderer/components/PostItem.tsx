import { useState } from 'react';
import {
  RetweetOutlined,
  HeartOutlined,
  HeartFilled,
  BookOutlined,
  BookFilled,
  MessageOutlined,
} from '@ant-design/icons';
import sanitizeHtml from 'sanitize-html';
import styled from 'styled-components';
import type { Post } from '../../shared/types.ts';
import { useSettings } from '../hooks/useSettings.ts';
import { MediaGallery } from './MediaGallery.tsx';
import { replaceCustomEmojis } from './customEmojis.ts';

interface PostItemProps {
  post: Post;
  serverUrl: string;
  accessToken: string;
  onReply?: (post: Post) => void;
  onCollapse?: () => void;
}

const PostContainer = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
`;

const AvatarColumn = styled.div<{ $width: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: ${(props) => props.$width}px;
`;

const Avatar = styled.img<{ $size: number }>`
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 4px;
  flex-shrink: 0;
`;

const BoosterBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 4px;
`;

const BoosterAvatar = styled.img<{ $size: number }>`
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 2px;
`;

const BoostIcon = styled(RetweetOutlined)<{ $fontSize: number }>`
  font-size: ${(props) => props.$fontSize}px;
  color: #52c41a;
`;

const BoostInfo = styled.div<{ $fontSize: number }>`
  margin-top: 4px;
  font-size: ${(props) => props.$fontSize}px;
  color: #52c41a;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const HeaderLine = styled.div<{ $mastodonLike: boolean }>`
  display: flex;
  flex-direction: ${(props) => (props.$mastodonLike ? 'column' : 'row')};
  gap: ${(props) => (props.$mastodonLike ? '0' : '8px')};
  align-items: ${(props) => (props.$mastodonLike ? 'flex-start' : 'baseline')};
  margin-bottom: 4px;
`;

const Acct = styled.span<{ $fontSize: number }>`
  color: #000;
  font-weight: 600;
  font-size: ${(props) => props.$fontSize}px;
`;

const DisplayName = styled.span<{ $fontSize: number }>`
  color: #8c8c8c;
  font-size: ${(props) => props.$fontSize}px;

  .custom-emoji {
    height: 1em;
    width: auto;
    vertical-align: middle;
    margin: 0 1px;
  }
`;

const PostBody = styled.div<{ $fontSize: number }>`
  font-size: ${(props) => props.$fontSize}px;
  line-height: 1.6;
  word-break: break-word;

  p {
    margin: 0 0 4px;
  }

  a {
    color: #1677ff;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  img.custom-emoji {
    height: 1em;
    width: auto;
    vertical-align: -0.1em;
  }
`;

const ContentWarning = styled.button<{ $fontSize: number }>`
  margin-bottom: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background: #fafafa;
  color: #262626;
  font-size: ${(props) => props.$fontSize}px;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: #1677ff;
    color: #1677ff;
  }
`;

const FooterLine = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
`;

const Timestamp = styled.a<{ $fontSize: number }>`
  font-size: ${(props) => props.$fontSize}px;
  color: #8c8c8c;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    color: #595959;
  }
`;

const ActionButton = styled.button<{ $active: boolean; $activeColor: string; $fontSize: number }>`
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  font-size: ${(props) => props.$fontSize}px;
  color: ${(props) => (props.$active ? props.$activeColor : '#8c8c8c')};
  display: inline-flex;
  align-items: center;
  border-radius: 4px;

  &:hover:not(:disabled) {
    background: #f5f5f5;
    color: ${(props) => props.$activeColor};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }
`;

function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'a',
      'br',
      'p',
      'span',
      'em',
      'strong',
      'b',
      'i',
      'u',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'img',
    ],
    allowedAttributes: {
      a: ['href', 'rel', 'target', 'class'],
      span: ['class'],
      img: ['src', 'alt', 'title', 'class'],
    },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function PostItem({
  post,
  serverUrl,
  accessToken,
  onReply,
  onCollapse,
}: PostItemProps): React.JSX.Element {
  const { settings } = useSettings();
  const [favourited, setFavourited] = useState(post.favourited);
  const [reblogged, setReblogged] = useState(post.reblogged);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const hasContentWarning = post.spoilerText.trim().length > 0;
  const [expanded, setExpanded] = useState(!hasContentWarning && !post.sensitive);

  const actionParams = { serverUrl, accessToken, statusId: post.id };
  const reblogDisabled = post.visibility === 'private' || post.visibility === 'direct';

  const handleFavourite = async (): Promise<void> => {
    if (favourited) {
      setFavourited(false);
      await window.api.unfavouriteStatus(actionParams);
    } else {
      setFavourited(true);
      await window.api.favouriteStatus(actionParams);
    }
  };

  const handleReblog = async (): Promise<void> => {
    if (reblogged) {
      setReblogged(false);
      await window.api.unreblogStatus(actionParams);
    } else {
      setReblogged(true);
      await window.api.reblogStatus(actionParams);
    }
  };

  const handleBookmark = async (): Promise<void> => {
    if (bookmarked) {
      setBookmarked(false);
      await window.api.unbookmarkStatus(actionParams);
    } else {
      setBookmarked(true);
      await window.api.bookmarkStatus(actionParams);
    }
  };

  const handleTimestampClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    if (post.url) {
      window.open(post.url, '_blank');
    }
  };

  const smallFontSize = settings.uiFontSize - 2;
  const hasMediaAttachments = post.mediaAttachments.length > 0;
  const isSensitiveWithoutContentWarning = post.sensitive && !hasContentWarning;
  const shouldHideContent = hasContentWarning && !expanded;
  const shouldHideMedia = (hasContentWarning || post.sensitive) && !expanded;

  return (
    <PostContainer>
      <AvatarColumn $width={settings.avatarSize}>
        <Avatar
          $size={settings.avatarSize}
          src={post.account.avatarUrl}
          alt={post.account.acct}
          onClick={onCollapse}
          style={onCollapse ? { cursor: 'pointer' } : undefined}
        />
        {post.rebloggedBy && (
          <BoosterBadge>
            <BoosterAvatar
              $size={settings.boostAvatarSize}
              src={post.rebloggedBy.avatarUrl}
              alt={post.rebloggedBy.acct}
            />
            <BoostIcon $fontSize={smallFontSize} />
          </BoosterBadge>
        )}
      </AvatarColumn>
      <Content>
        <HeaderLine $mastodonLike={settings.mastodonLikeExpandedDisplay}>
          {settings.mastodonLikeExpandedDisplay && (
            <DisplayName
              $fontSize={settings.uiFontSize}
              dangerouslySetInnerHTML={{
                __html: sanitizeContent(
                  replaceCustomEmojis(escapeHtml(post.account.displayName), post.account.emojis),
                ),
              }}
            />
          )}
          <Acct $fontSize={settings.uiFontSize}>@{post.account.acct}</Acct>
          {!settings.mastodonLikeExpandedDisplay && (
            <DisplayName
              $fontSize={settings.uiFontSize}
              dangerouslySetInnerHTML={{
                __html: sanitizeContent(
                  replaceCustomEmojis(escapeHtml(post.account.displayName), post.account.emojis),
                ),
              }}
            />
          )}
        </HeaderLine>
        {hasContentWarning && (
          <ContentWarning $fontSize={settings.postFontSize} onClick={() => setExpanded(!expanded)}>
            {post.spoilerText}
            {expanded ? '（クリックで隠す）' : '（クリックで表示）'}
          </ContentWarning>
        )}
        {!shouldHideContent && (
          <PostBody
            $fontSize={settings.postFontSize}
            dangerouslySetInnerHTML={{
              __html: sanitizeContent(replaceCustomEmojis(post.content, post.emojis)),
            }}
          />
        )}
        {isSensitiveWithoutContentWarning && hasMediaAttachments && (
          <ContentWarning $fontSize={settings.postFontSize} onClick={() => setExpanded(!expanded)}>
            センシティブなメディアが含まれます
            {expanded ? '（クリックで隠す）' : '（クリックで表示）'}
          </ContentWarning>
        )}
        {hasMediaAttachments && !shouldHideMedia && (
          <MediaGallery attachments={post.mediaAttachments} />
        )}
        <FooterLine>
          {post.url ? (
            <Timestamp $fontSize={smallFontSize} href={post.url} onClick={handleTimestampClick}>
              {formatTimestamp(post.createdAt)}
            </Timestamp>
          ) : (
            <Timestamp as="span" $fontSize={smallFontSize}>
              {formatTimestamp(post.createdAt)}
            </Timestamp>
          )}
          <ActionButton
            $active={favourited}
            $activeColor="#eb2f96"
            $fontSize={smallFontSize}
            onClick={handleFavourite}
            title="お気に入り"
          >
            {favourited ? <HeartFilled /> : <HeartOutlined />}
          </ActionButton>
          <ActionButton
            $active={reblogged}
            $activeColor="#52c41a"
            $fontSize={smallFontSize}
            onClick={handleReblog}
            title={reblogDisabled ? 'この投稿はブーストできません' : 'ブースト'}
            disabled={reblogDisabled}
          >
            <RetweetOutlined />
          </ActionButton>
          <ActionButton
            $active={false}
            $activeColor="#1677ff"
            $fontSize={smallFontSize}
            onClick={() => onReply?.(post)}
            title="メンションで返信"
          >
            <MessageOutlined />
          </ActionButton>
          <ActionButton
            $active={bookmarked}
            $activeColor="#1677ff"
            $fontSize={smallFontSize}
            onClick={handleBookmark}
            title="ブックマーク"
          >
            {bookmarked ? <BookFilled /> : <BookOutlined />}
          </ActionButton>
        </FooterLine>
        {post.rebloggedBy && (
          <BoostInfo $fontSize={smallFontSize}>
            <RetweetOutlined />
            <span>@{post.rebloggedBy.acct} boost this</span>
          </BoostInfo>
        )}
      </Content>
    </PostContainer>
  );
}
