import { useState } from 'react';
import {
  RetweetOutlined,
  HeartOutlined,
  HeartFilled,
  BookOutlined,
  BookFilled,
  MessageOutlined,
  LinkOutlined,
  DownOutlined,
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
  onQuote?: (post: Post) => void;
  onOpenAccountTimeline?: (account: Post['account']) => void;
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

const ProfileIdentityButton = styled.button<{ $mastodonLike: boolean }>`
  display: inline-flex;
  flex-direction: ${(props) => (props.$mastodonLike ? 'column' : 'row')};
  gap: ${(props) => (props.$mastodonLike ? '0' : '8px')};
  align-items: ${(props) => (props.$mastodonLike ? 'flex-start' : 'baseline')};
  background: none;
  border: 0;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
  min-width: 0;

  &:hover .profile-name,
  &:hover .profile-acct {
    color: #1677ff;
  }
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

  blockquote {
    margin: 8px 0;
    padding: 8px 12px;
    border-left: 4px solid #91caff;
    background: #f0f7ff;
    color: #434343;
  }

  blockquote p:last-child {
    margin-bottom: 0;
  }

  q {
    padding: 1px 4px;
    border-radius: 3px;
    background: #f0f7ff;
    color: #434343;
  }

  .quote-inline {
    display: none;
  }
`;

const QuotePreview = styled.div<{ $fontSize: number }>`
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-left: 4px solid #1677ff;
  border-radius: 6px;
  background: #fafafa;
  font-size: ${(props) => props.$fontSize}px;
`;

const QuoteHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-bottom: 6px;
`;

const QuoteAvatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 3px;
  flex-shrink: 0;
`;

const QuoteIdentity = styled.button`
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
  min-width: 0;
  border: 0;
  padding: 0;
  margin: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover .quote-acct,
  &:hover .quote-name {
    color: #1677ff;
  }
`;

const QuoteName = styled.span`
  color: #262626;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  .custom-emoji {
    height: 1em;
    width: auto;
    vertical-align: middle;
    margin: 0 1px;
  }
`;

const QuoteAcct = styled.span`
  color: #8c8c8c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const QuoteBody = styled.div`
  color: #434343;
  line-height: 1.5;
  word-break: break-word;

  p {
    margin: 0 0 4px;
  }

  p:last-child {
    margin-bottom: 0;
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

  blockquote {
    margin: 6px 0;
    padding: 6px 10px;
    border-left: 3px solid #91caff;
    background: #f0f7ff;
  }

  q {
    padding: 1px 4px;
    border-radius: 3px;
    background: #f0f7ff;
  }

  .quote-inline {
    display: none;
  }
`;

const QuotePlaceholder = styled.div`
  color: #8c8c8c;
`;

const ContentWarning = styled.button<{ $fontSize: number }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
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

const ContentWarningIcon = styled(DownOutlined)`
  font-size: 0.8em;
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
      'q',
      'ul',
      'ol',
      'li',
      'img',
    ],
    allowedAttributes: {
      a: ['href', 'rel', 'target', 'class'],
      p: ['class'],
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

function quoteStateLabel(state: NonNullable<Post['quote']>['state']): string {
  switch (state) {
    case 'pending':
      return '引用は承認待ちです';
    case 'rejected':
    case 'revoked':
      return '引用は表示できません';
    case 'deleted':
      return '引用元の投稿は削除されています';
    case 'unauthorized':
      return '引用元の投稿を表示する権限がありません';
    case 'blocked_account':
    case 'blocked_domain':
    case 'muted_account':
      return '引用元の投稿は表示されません';
    case 'accepted':
      return '引用元の投稿を読み込めません';
  }
}

function QuoteCard({
  quote,
  fontSize,
  onOpenAccountTimeline,
}: {
  quote: NonNullable<Post['quote']>;
  fontSize: number;
  onOpenAccountTimeline?: (account: Post['account']) => void;
}): React.JSX.Element {
  const quotedPost = quote.quotedPost;

  if (!quotedPost) {
    return (
      <QuotePreview $fontSize={fontSize}>
        <QuotePlaceholder>{quoteStateLabel(quote.state)}</QuotePlaceholder>
      </QuotePreview>
    );
  }

  return (
    <QuotePreview $fontSize={fontSize}>
      <QuoteHeader>
        <QuoteAvatar src={quotedPost.account.avatarUrl} alt={quotedPost.account.acct} />
        <QuoteIdentity type="button" onClick={() => onOpenAccountTimeline?.(quotedPost.account)}>
          <QuoteName
            className="quote-name"
            dangerouslySetInnerHTML={{
              __html: sanitizeContent(
                replaceCustomEmojis(
                  escapeHtml(quotedPost.account.displayName),
                  quotedPost.account.emojis,
                ),
              ),
            }}
          />
          <QuoteAcct className="quote-acct">@{quotedPost.account.acct}</QuoteAcct>
        </QuoteIdentity>
      </QuoteHeader>
      <QuoteBody
        dangerouslySetInnerHTML={{
          __html: sanitizeContent(replaceCustomEmojis(quotedPost.content, quotedPost.emojis)),
        }}
      />
    </QuotePreview>
  );
}

export function PostItem({
  post,
  serverUrl,
  accessToken,
  onReply,
  onQuote,
  onOpenAccountTimeline,
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

  const handleAvatarClick = (): void => {
    onCollapse?.();
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
          onClick={handleAvatarClick}
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
          <ProfileIdentityButton
            type="button"
            $mastodonLike={settings.mastodonLikeExpandedDisplay}
            onClick={() => onOpenAccountTimeline?.(post.account)}
          >
            {settings.mastodonLikeExpandedDisplay && (
              <DisplayName
                className="profile-name"
                $fontSize={settings.uiFontSize}
                dangerouslySetInnerHTML={{
                  __html: sanitizeContent(
                    replaceCustomEmojis(escapeHtml(post.account.displayName), post.account.emojis),
                  ),
                }}
              />
            )}
            <Acct className="profile-acct" $fontSize={settings.uiFontSize}>
              @{post.account.acct}
            </Acct>
            {!settings.mastodonLikeExpandedDisplay && (
              <DisplayName
                className="profile-name"
                $fontSize={settings.uiFontSize}
                dangerouslySetInnerHTML={{
                  __html: sanitizeContent(
                    replaceCustomEmojis(escapeHtml(post.account.displayName), post.account.emojis),
                  ),
                }}
              />
            )}
          </ProfileIdentityButton>
        </HeaderLine>
        {hasContentWarning && (
          <ContentWarning $fontSize={settings.postFontSize} onClick={() => setExpanded(!expanded)}>
            {post.spoilerText}
            {expanded ? '（クリックで隠す）' : <ContentWarningIcon aria-hidden="true" />}
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
            NSFW
            {expanded ? '（クリックで隠す）' : <ContentWarningIcon aria-hidden="true" />}
          </ContentWarning>
        )}
        {hasMediaAttachments && !shouldHideMedia && (
          <MediaGallery attachments={post.mediaAttachments} />
        )}
        {post.quote && !shouldHideContent && (
          <QuoteCard
            quote={post.quote}
            fontSize={smallFontSize}
            onOpenAccountTimeline={onOpenAccountTimeline}
          />
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
            $active={false}
            $activeColor="#1677ff"
            $fontSize={smallFontSize}
            onClick={() => onQuote?.(post)}
            title="引用"
          >
            <LinkOutlined />
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
