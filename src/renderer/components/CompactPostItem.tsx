import { memo } from 'react';
import { BarChartOutlined, LinkOutlined, PictureOutlined } from '@ant-design/icons';
import sanitizeHtml from 'sanitize-html';
import styled from 'styled-components';
import type { Post } from '../../shared/types.ts';
import { useSettings } from '../hooks/useSettings.ts';
import { replaceCustomEmojis } from './customEmojis.ts';

interface CompactPostItemProps {
  post: Post;
  onClick: (postId: string) => void;
  onOpenAccountTimeline?: (account: Post['account']) => void;
}

const Row = styled.div<{ $rowHeight: number }>`
  display: grid;
  grid-template-columns: 28px 100px 1fr;
  align-items: center;
  height: ${(props) => props.$rowHeight}px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;

  &:hover {
    filter: brightness(0.95);
  }
`;

const IconCell = styled.div`
  background: #d9f7be;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const CompactAvatar = styled.img<{ $rowHeight: number; $clickable: boolean }>`
  width: 35px;
  height: ${(props) => Math.max(props.$rowHeight, 14)}px;
  object-fit: cover;
  cursor: ${(props) => (props.$clickable ? 'pointer' : 'inherit')};
`;

const AcctCellButton = styled.button<{ $boosted: boolean }>`
  background: ${(props) => (props.$boosted ? '#fff1f0' : '#fffbe6')};
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  width: 100%;
  overflow: hidden;
  appearance: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
`;

const AcctText = styled.span<{ $fontSize: number }>`
  font-size: ${(props) => props.$fontSize}px;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BodyCell = styled.div<{ $visibility: string; $hasSpoiler: boolean }>`
  background: ${(props) => {
    if (props.$hasSpoiler) return '#f6ffed';
    if (props.$visibility === 'direct') return '#f9f0ff';
    if (props.$visibility === 'private') return '#f6ffed';
    return '#e6f7ff';
  }};
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 6px;
  overflow: hidden;
`;

const BodyText = styled.span<{ $fontSize: number }>`
  font-size: ${(props) => props.$fontSize}px;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .custom-emoji {
    height: 1em;
    width: auto;
    vertical-align: middle;
    margin: 0 1px;
  }
`;

const MediaIcon = styled(PictureOutlined)<{ $fontSize: number }>`
  font-size: ${(props) => props.$fontSize}px;
  color: #8c8c8c;
  flex-shrink: 0;
  margin-left: 4px;
`;

const QuoteIcon = styled(LinkOutlined)<{ $fontSize: number }>`
  font-size: ${(props) => props.$fontSize}px;
  color: #1677ff;
  flex-shrink: 0;
  margin-left: 4px;
`;

const PollIcon = styled(BarChartOutlined)<{ $fontSize: number }>`
  font-size: ${(props) => props.$fontSize}px;
  color: #1677ff;
  flex-shrink: 0;
  margin-left: 4px;
`;

function stripHtmlPreservingEmojis(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  let result = '';
  for (const node of div.childNodes) {
    result += extractTextAndEmojis(node);
  }
  return result;
}

function extractTextAndEmojis(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    if (el.tagName === 'IMG' && el.classList.contains('custom-emoji')) {
      return el.outerHTML;
    }
    if (el.tagName === 'BR') {
      return ' ';
    }
    let result = '';
    for (const child of el.childNodes) {
      result += extractTextAndEmojis(child);
    }
    return result;
  }
  return '';
}

function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['img'],
    allowedAttributes: {
      img: ['src', 'alt', 'title', 'class'],
    },
  });
}

function shortAcct(acct: string): string {
  const atIndex = acct.indexOf('@');
  if (atIndex === -1) return `@${acct}`;
  return `@${acct.substring(0, atIndex)}`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// タイムラインは 1 件の投稿追加で全行が再レンダーされるため、memo で
// props が変わらない行の再レンダーをスキップする
export const CompactPostItem = memo(function CompactPostItem({
  post,
  onClick,
  onOpenAccountTimeline,
}: CompactPostItemProps): React.JSX.Element {
  const { settings } = useSettings();
  const compactFontSize = Math.max(settings.compactFontSize, 8);
  const rowHeight = Math.max(compactFontSize + 10, 20);
  const hasSpoiler = post.spoilerText.trim().length > 0;
  const bodyHtml = hasSpoiler
    ? sanitizeContent(replaceCustomEmojis(escapeHtml(post.spoilerText), post.emojis))
    : sanitizeContent(stripHtmlPreservingEmojis(replaceCustomEmojis(post.content, post.emojis)));
  const hasMedia = post.mediaAttachments.length > 0;
  const hasQuote = post.quote !== undefined;
  const hasPoll = post.poll !== undefined;

  return (
    <Row
      $rowHeight={rowHeight}
      onClick={() => {
        onClick(post.id);
      }}
    >
      <IconCell>
        <CompactAvatar
          $rowHeight={rowHeight}
          $clickable={false}
          src={post.account.avatarUrl}
          alt={post.account.acct}
          onClick={(event) => {
            event.stopPropagation();
          }}
        />
      </IconCell>
      <AcctCellButton
        type="button"
        $boosted={!!post.rebloggedBy}
        onClick={(event) => {
          event.stopPropagation();
          onOpenAccountTimeline?.(post.account);
        }}
      >
        <AcctText $fontSize={compactFontSize}>{shortAcct(post.account.acct)}</AcctText>
      </AcctCellButton>
      <BodyCell $visibility={post.visibility} $hasSpoiler={hasSpoiler}>
        <BodyText $fontSize={compactFontSize} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        {hasMedia ? <MediaIcon $fontSize={compactFontSize} /> : null}
        {hasQuote ? <QuoteIcon $fontSize={compactFontSize} /> : null}
        {hasPoll ? <PollIcon $fontSize={compactFontSize} /> : null}
      </BodyCell>
    </Row>
  );
});
