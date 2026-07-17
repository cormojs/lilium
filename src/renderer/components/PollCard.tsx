import { useState } from 'react';
import { App, Button, Checkbox, Progress, Radio } from 'antd';
import sanitizeHtml from 'sanitize-html';
import styled from 'styled-components';
import type { PostPoll } from '../../shared/types.ts';
import { replaceCustomEmojis } from './customEmojis.ts';

/** 投票・結果再取得の操作に必要な情報。省略時は結果の閲覧専用になる */
export interface PollCardInteraction {
  postId: string;
  serverUrl: string;
  username: string;
  onPollChange?: (postId: string, poll: PostPoll) => void;
}

interface PollCardProps {
  poll: PostPoll;
  fontSize: number;
  interaction?: PollCardInteraction;
}

const PollContainer = styled.div<{ $fontSize: number }>`
  margin-top: 10px;
  padding: 10px 12px;
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

const PollOptionRow = styled.label<{ $selectable: boolean }>`
  display: grid;
  grid-template-columns: ${(props) => (props.$selectable ? 'auto 1fr auto' : '1fr auto')};
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  color: #8c8c8c;
`;

const PollActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['a', 'br', 'p', 'span', 'em', 'strong', 'b', 'i', 'u', 'img'],
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

function formatPollExpiration(expiresAt: string | null): string {
  if (!expiresAt) {
    return '終了時刻なし';
  }

  return `${formatTimestamp(expiresAt)} まで`;
}

function pollStatusText(poll: PostPoll): string {
  const participantCount = poll.votersCount ?? poll.votesCount;
  const participantLabel = poll.multiple ? '投票者' : '票';
  const expirationLabel = poll.expired ? '終了済み' : formatPollExpiration(poll.expiresAt);
  return `${participantCount.toLocaleString()} ${participantLabel}・${expirationLabel}`;
}

export function PollCard({ poll, fontSize, interaction }: PollCardProps): React.JSX.Element {
  const { message } = App.useApp();
  const [choiceOverride, setChoiceOverride] = useState<{
    pollId: string;
    choices: number[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const showResults =
    poll.voted || poll.expired || poll.options.some((option) => option.votesCount !== null);
  const canVote = interaction !== undefined && !poll.expired && !poll.voted;
  const selectedChoices =
    choiceOverride?.pollId === poll.id ? choiceOverride.choices : poll.ownVotes;
  const totalVotes = Math.max(poll.votesCount, 0);

  const updatePoll = (updatedPoll: PostPoll): void => {
    interaction?.onPollChange?.(interaction.postId, updatedPoll);
  };

  const handleVote = async (): Promise<void> => {
    if (!interaction || selectedChoices.length === 0) {
      return;
    }

    setBusy(true);
    const updatedPoll = await window.api
      .votePoll({
        serverUrl: interaction.serverUrl,
        username: interaction.username,
        pollId: poll.id,
        choices: selectedChoices,
      })
      .catch((e: unknown) => {
        message.error(`投票に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      });
    if (updatedPoll) {
      setChoiceOverride(null);
      updatePoll(updatedPoll);
    }
    setBusy(false);
  };

  const handleRefresh = async (): Promise<void> => {
    if (!interaction) {
      return;
    }

    setBusy(true);
    const updatedPoll = await window.api
      .refreshPoll({
        serverUrl: interaction.serverUrl,
        username: interaction.username,
        pollId: poll.id,
      })
      .catch((e: unknown) => {
        message.error(
          `投票結果の再取得に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
        );
        return null;
      });
    if (updatedPoll) {
      updatePoll(updatedPoll);
    }
    setBusy(false);
  };

  return (
    <PollContainer $fontSize={fontSize}>
      <PollOptionList>
        {poll.options.map((option, index) => {
          const votesCount = option.votesCount;
          const percent =
            votesCount !== null && totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
          const checked = selectedChoices.includes(index);

          return (
            <PollOptionRow
              key={`${poll.id}-${String(index)}`}
              $selectable={interaction !== undefined}
            >
              {interaction !== undefined ? (
                poll.multiple ? (
                  <Checkbox
                    checked={checked}
                    disabled={!canVote || busy}
                    onChange={(event) => {
                      setChoiceOverride((prev) => {
                        const currentChoices =
                          prev?.pollId === poll.id ? prev.choices : poll.ownVotes;
                        const choices = event.target.checked
                          ? [...currentChoices, index]
                          : currentChoices.filter((choice) => choice !== index);
                        return { pollId: poll.id, choices };
                      });
                    }}
                  />
                ) : (
                  <Radio
                    checked={checked}
                    disabled={!canVote || busy}
                    onChange={() => {
                      setChoiceOverride({ pollId: poll.id, choices: [index] });
                    }}
                  />
                )
              ) : null}
              <PollOptionTitle
                dangerouslySetInnerHTML={{
                  __html: sanitizeContent(
                    replaceCustomEmojis(escapeHtml(option.title), option.emojis),
                  ),
                }}
              />
              {showResults ? (
                <PollCount>{votesCount === null ? '-' : votesCount.toLocaleString()}</PollCount>
              ) : null}
              {showResults ? (
                <PollResult style={{ gridColumn: interaction !== undefined ? '2 / 4' : '1 / 3' }}>
                  <Progress percent={percent} size="small" showInfo={false} />
                  <span>{percent}%</span>
                </PollResult>
              ) : null}
            </PollOptionRow>
          );
        })}
      </PollOptionList>
      <PollMeta>
        <span>{poll.multiple ? '複数選択' : '単一選択'}</span>
        <span>{pollStatusText(poll)}</span>
      </PollMeta>
      {interaction !== undefined ? (
        <PollActions>
          {canVote ? (
            <Button
              type="primary"
              size="small"
              loading={busy}
              disabled={selectedChoices.length === 0}
              onClick={() => {
                void handleVote();
              }}
            >
              投票
            </Button>
          ) : null}
          <Button
            size="small"
            loading={busy}
            onClick={() => {
              void handleRefresh();
            }}
          >
            結果を再取得
          </Button>
        </PollActions>
      ) : null}
    </PollContainer>
  );
}
