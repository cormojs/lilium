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

interface NotificationItemProps {
  notification: MastoNotification;
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
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['a', 'br', 'p', 'span', 'em', 'strong', 'b', 'i', 'u'],
    allowedAttributes: {
      a: ['href', 'rel', 'target', 'class'],
      span: ['class'],
    },
  });
}

export function NotificationItem({ notification }: NotificationItemProps): React.JSX.Element {
  const { settings } = useSettings();

  return (
    <NotificationContainer>
      <Avatar
        $size={settings.avatarSize}
        src={notification.account.avatarUrl}
        alt={notification.account.acct}
      />
      <Content>
        <NotificationHeader $fontSize={settings.uiFontSize}>
          {NOTIFICATION_ICON[notification.type]}
          <span>
            <Acct>@{notification.account.acct}</Acct>
            <NotificationMessage>{NOTIFICATION_LABEL[notification.type]}</NotificationMessage>
          </span>
        </NotificationHeader>
        {notification.status && (
          <StatusPreview
            $fontSize={settings.postFontSize - 1}
            dangerouslySetInnerHTML={{ __html: sanitizeContent(notification.status.content) }}
          />
        )}
        <Timestamp $fontSize={settings.uiFontSize - 2}>
          {formatTimestamp(notification.createdAt)}
        </Timestamp>
      </Content>
    </NotificationContainer>
  );
}
