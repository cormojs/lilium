import { RetweetOutlined } from '@ant-design/icons';
import sanitizeHtml from 'sanitize-html';
import styled from 'styled-components';
import type { Post } from '../../shared/types.ts';
import { useSettings } from '../hooks/useSettings.ts';
import { MediaGallery } from './MediaGallery.tsx';

interface PostItemProps {
  post: Post;
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

const HeaderLine = styled.div`
  display: flex;
  gap: 8px;
  align-items: baseline;
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
`;

const Timestamp = styled.a<{ $fontSize: number }>`
  display: inline-block;
  margin-top: 4px;
  font-size: ${(props) => props.$fontSize}px;
  color: #8c8c8c;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    color: #595959;
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
    ],
    allowedAttributes: {
      a: ['href', 'rel', 'target', 'class'],
      span: ['class'],
    },
  });
}

export function PostItem({ post }: PostItemProps): React.JSX.Element {
  const { settings } = useSettings();

  const handleTimestampClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    if (post.url) {
      window.open(post.url, '_blank');
    }
  };

  return (
    <PostContainer>
      <AvatarColumn $width={settings.avatarSize}>
        <Avatar $size={settings.avatarSize} src={post.account.avatarUrl} alt={post.account.acct} />
        {post.rebloggedBy && (
          <BoosterBadge>
            <BoosterAvatar
              $size={settings.boostAvatarSize}
              src={post.rebloggedBy.avatarUrl}
              alt={post.rebloggedBy.acct}
            />
            <BoostIcon $fontSize={settings.uiFontSize - 2} />
          </BoosterBadge>
        )}
      </AvatarColumn>
      <Content>
        <HeaderLine>
          <Acct $fontSize={settings.uiFontSize}>@{post.account.acct}</Acct>
          <DisplayName $fontSize={settings.uiFontSize}>{post.account.displayName}</DisplayName>
        </HeaderLine>
        <PostBody
          $fontSize={settings.postFontSize}
          dangerouslySetInnerHTML={{ __html: sanitizeContent(post.content) }}
        />
        {post.mediaAttachments.length > 0 && <MediaGallery attachments={post.mediaAttachments} />}
        {post.url ? (
          <Timestamp
            $fontSize={settings.uiFontSize - 2}
            href={post.url}
            onClick={handleTimestampClick}
          >
            {formatTimestamp(post.createdAt)}
          </Timestamp>
        ) : (
          <Timestamp as="span" $fontSize={settings.uiFontSize - 2}>
            {formatTimestamp(post.createdAt)}
          </Timestamp>
        )}
        {post.rebloggedBy && (
          <BoostInfo $fontSize={settings.uiFontSize - 2}>
            <RetweetOutlined />
            <span>@{post.rebloggedBy.acct} boost this</span>
          </BoostInfo>
        )}
      </Content>
    </PostContainer>
  );
}
