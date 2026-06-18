import {
  HeartFilled,
  RetweetOutlined,
  UserAddOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import sanitizeHtml from 'sanitize-html';
import styled from 'styled-components';
import type { MastoNotification, NotificationType } from '../../shared/types.ts';
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

const Timestamp = styled.span<{ $fontSize: number }>`
  display: inline-block;
  margin-top: 4px;
  font-size: ${(props) => props.$fontSize}px;
  color: #8c8c8c;
`;

const NOTIFICATION_ICON: Record<NotificationType, React.ReactNode> = {
  follow: <UserAddOutlined style={{ color: '#1677ff' }} />,
  follow_request: <QuestionCircleOutlined style={{ color: '#faad14' }} />,
  favourite: <HeartFilled style={{ color: '#eb2f96' }} />,
  reblog: <RetweetOutlined style={{ color: '#52c41a' }} />,
};

const NOTIFICATION_LABEL: Record<NotificationType, string> = {
  follow: 'にフォローされました',
  follow_request: 'からフォローリクエスト',
  favourite: 'がお気に入りに追加',
  reblog: 'がブースト',
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

export function NotificationItem({
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
        {notification.status && (
          <StatusPreview
            $fontSize={settings.postFontSize - 1}
            dangerouslySetInnerHTML={{
              __html: sanitizeContent(
                replaceCustomEmojis(notification.status.content, notification.status.emojis),
              ),
            }}
          />
        )}
        <Timestamp $fontSize={settings.uiFontSize - 2}>
          {formatTimestamp(notification.createdAt)}
        </Timestamp>
      </Content>
    </NotificationContainer>
  );
}
