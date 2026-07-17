import { memo } from 'react';
import {
  StarFilled,
  RetweetOutlined,
  UserAddOutlined,
  QuestionCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { Progress } from 'antd';
import sanitizeHtml from 'sanitize-html';
import styled from 'styled-components';
import type { MastoNotification, NotificationType, PostPoll } from '../../shared/types.ts';
import { useSettings } from '../hooks/useSettings.ts';
import { replaceCustomEmojis } from './customEmojis.ts';

interface NotificationItemProps {
  notification: MastoNotification;
  onOpenAccountTimeline?: (account: MastoNotification['account']) => void;
}

const NotificationContainer = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
`;

const Avatar = styled.img<{ $size: number }>`
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 4px;
  flex-shrink: 0;
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotificationHeader = styled.div<{ $fontSize: number }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: ${(props) => props.$fontSize}px;
`;

const Acct = styled.span`
  font-weight: 600;
`;

const NotificationMessage = styled.span`
  color: #8c8c8c;
`;

const IdentityButton = styled.button`
  background: none;
  border: 0;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;

  &:hover .notification-acct {
    color: #1677ff;
  }
`;

const StatusPreview = styled.div<{ $fontSize: number }>`
  margin-top: 8px;
  padding: 8px 12px;
  border-left: 3px solid #d9d9d9;
  font-size: ${(props) => props.$fontSize}px;
  color: #595959;
  line-height: 1.5;

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

const PollResultContainer = styled.div<{ $fontSize: number }>`
  margin-top: 8px;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fafafa;
  font-size: ${(props) => props.$fontSize}px;
`;

const PollOptionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PollOptionRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
`;

const PollOptionTitle = styled.span`
  color: #262626;
  word-break: break-word;

  .custom-emoji {
    height: 1em;
    width: auto;
    vertical-align: -0.1em;
  }
`;

const PollResult = styled.div`
  grid-column: 1 / 3;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PollCount = styled.span`
  min-width: 44px;
  color: #8c8c8c;
  text-align: right;
`;

const PollMeta = styled.div`
  margin-top: 10px;
  color: #8c8c8c;
`;

const Timestamp = styled.span<{ $fontSize: number }>`
  display: inline-block;
  margin-top: 4px;
  font-size: ${(props) => props.$fontSize}px;
  color: #8c8c8c;
`;

const NOTIFICATION_ICON: Record<NotificationType, React.ReactNode> = {
  follow: <UserAddOutlined style={{ color: '#1677ff' }} />,
  follow_request: <QuestionCircleOutlined style={{ color: '#faad14' }} />,
  favourite: <StarFilled style={{ color: '#eb2f96' }} />,
  reblog: <RetweetOutlined style={{ color: '#52c41a' }} />,
  poll: <BarChartOutlined style={{ color: '#1677ff' }} />,
};

const NOTIFICATION_LABEL: Record<NotificationType, string> = {
  follow: 'にフォローされました',
  follow_request: 'からフォローリクエスト',
  favourite: 'がお気に入りに追加',
  reblog: 'がブースト',
  poll: 'の投票が終了しました',
};

function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['a', 'br', 'p', 'span', 'em', 'strong', 'b', 'i', 'u', 'blockquote', 'q', 'img'],
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

function PollResultView({
  poll,
  fontSize,
}: {
  poll: PostPoll;
  fontSize: number;
}): React.JSX.Element {
  const totalVotes = Math.max(poll.votesCount, 0);
  const participantCount = poll.votersCount ?? poll.votesCount;
  const participantLabel = poll.multiple ? '投票者' : '票';

  return (
    <PollResultContainer $fontSize={fontSize}>
      <PollOptionList>
        {poll.options.map((option, index) => {
          const votesCount = option.votesCount;
          const percent =
            votesCount !== null && totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;

          return (
            <PollOptionRow key={`${poll.id}-${String(index)}`}>
              <PollOptionTitle
                dangerouslySetInnerHTML={{
                  __html: sanitizeContent(
                    replaceCustomEmojis(escapeHtml(option.title), option.emojis),
                  ),
                }}
              />
              <PollCount>{votesCount === null ? '-' : votesCount.toLocaleString()}</PollCount>
              <PollResult>
                <Progress percent={percent} size="small" showInfo={false} />
                <span>{percent}%</span>
              </PollResult>
            </PollOptionRow>
          );
        })}
      </PollOptionList>
      <PollMeta>
        {participantCount.toLocaleString()} {participantLabel}
      </PollMeta>
    </PollResultContainer>
  );
}

// 通知リストは 1 件の通知追加で全行が再レンダーされるため、memo で
// props が変わらない行の再レンダーをスキップする
export const NotificationItem = memo(function NotificationItem({
  notification,
  onOpenAccountTimeline,
}: NotificationItemProps): React.JSX.Element {
  const { settings } = useSettings();

  return (
    <NotificationContainer>
      <Avatar
        $size={settings.avatarSize}
        src={notification.account.avatarUrl}
        alt={notification.account.acct}
        style={undefined}
      />
      <Content>
        <NotificationHeader $fontSize={settings.uiFontSize}>
          {NOTIFICATION_ICON[notification.type]}
          <IdentityButton
            type="button"
            onClick={() => onOpenAccountTimeline?.(notification.account)}
          >
            <Acct className="notification-acct">@{notification.account.acct}</Acct>
            <NotificationMessage>{NOTIFICATION_LABEL[notification.type]}</NotificationMessage>
          </IdentityButton>
        </NotificationHeader>
        {notification.status ? (
          <StatusPreview
            $fontSize={settings.postFontSize - 1}
            dangerouslySetInnerHTML={{
              __html: sanitizeContent(
                replaceCustomEmojis(notification.status.content, notification.status.emojis),
              ),
            }}
          />
        ) : null}
        {notification.type === 'poll' && notification.status?.poll ? (
          <PollResultView poll={notification.status.poll} fontSize={settings.postFontSize - 1} />
        ) : null}
        <Timestamp $fontSize={settings.uiFontSize - 2}>
          {formatTimestamp(notification.createdAt)}
        </Timestamp>
      </Content>
    </NotificationContainer>
  );
});
