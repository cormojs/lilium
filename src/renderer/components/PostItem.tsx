import sanitizeHtml from 'sanitize-html';
import styled from 'styled-components';
import type { Post } from '../../shared/types.ts';
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

const Avatar = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 4px;
  flex-shrink: 0;
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

const Acct = styled.span`
  color: #000;
  font-weight: 600;
  font-size: 14px;
`;

const DisplayName = styled.span`
  color: #8c8c8c;
  font-size: 14px;
`;

const PostBody = styled.div`
  font-size: 14px;
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

const Timestamp = styled.a`
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
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
  const handleTimestampClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    if (post.url) {
      window.open(post.url, '_blank');
    }
  };

  return (
    <PostContainer>
      <Avatar src={post.account.avatarUrl} alt={post.account.acct} />
      <Content>
        <HeaderLine>
          <Acct>@{post.account.acct}</Acct>
          <DisplayName>{post.account.displayName}</DisplayName>
        </HeaderLine>
        <PostBody dangerouslySetInnerHTML={{ __html: sanitizeContent(post.content) }} />
        {post.mediaAttachments.length > 0 && <MediaGallery attachments={post.mediaAttachments} />}
        {post.url ? (
          <Timestamp href={post.url} onClick={handleTimestampClick}>
            {formatTimestamp(post.createdAt)}
          </Timestamp>
        ) : (
          <Timestamp as="span">{formatTimestamp(post.createdAt)}</Timestamp>
        )}
      </Content>
    </PostContainer>
  );
}
