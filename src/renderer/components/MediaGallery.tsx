import { useState } from 'react';
import { Button, Modal } from 'antd';
import styled from 'styled-components';
import type { PostMediaAttachment } from '../../shared/types.ts';

interface MediaGalleryProps {
  attachments: PostMediaAttachment[];
}

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
`;

const Thumbnail = styled.img`
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  display: block;

  &:hover {
    opacity: 0.85;
  }
`;

const MediaVideo = styled.video`
  width: 300px;
  max-width: 100%;
  max-height: 320px;
  border-radius: 4px;
  background: #000;
`;

const AudioAttachment = styled.div`
  width: min(420px, 100%);
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fafafa;

  audio {
    width: 100%;
    display: block;
  }
`;

const FallbackLink = styled(Button)`
  max-width: 100%;
`;

const PreviewImage = styled.img`
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
`;

function getPosterUrl(attachment: PostMediaAttachment): string | undefined {
  return attachment.previewUrl !== attachment.url ? attachment.previewUrl : undefined;
}

export function MediaGallery({ attachments }: MediaGalleryProps): React.JSX.Element | null {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (attachments.length === 0) return null;

  const previewImage = previewIndex !== null ? attachments[previewIndex] : null;

  return (
    <>
      <Grid>
        {attachments.map((attachment, index) => {
          if (attachment.type === 'image') {
            return (
              <Thumbnail
                key={attachment.id}
                src={attachment.previewUrl}
                alt={attachment.description ?? ''}
                onClick={() => {
                  setPreviewIndex(index);
                }}
              />
            );
          }

          if (attachment.type === 'video' || attachment.type === 'gifv') {
            return (
              <MediaVideo
                key={attachment.id}
                src={attachment.url}
                poster={getPosterUrl(attachment)}
                controls
                muted={attachment.type === 'gifv'}
                loop={attachment.type === 'gifv'}
              />
            );
          }

          if (attachment.type === 'audio') {
            return (
              <AudioAttachment key={attachment.id}>
                <audio
                  src={attachment.url}
                  controls
                  aria-label={attachment.description ?? '音声'}
                />
              </AudioAttachment>
            );
          }

          return (
            <FallbackLink
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
            >
              メディアを開く
            </FallbackLink>
          );
        })}
      </Grid>
      <Modal
        open={previewImage?.type === 'image'}
        onCancel={() => {
          setPreviewIndex(null);
        }}
        footer={null}
        centered
        width="auto"
        styles={{ body: { padding: 0, lineHeight: 0 } }}
      >
        {previewImage ? (
          <PreviewImage src={previewImage.url} alt={previewImage.description ?? ''} />
        ) : null}
      </Modal>
    </>
  );
}
