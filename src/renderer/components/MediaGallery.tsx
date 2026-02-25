import { useState } from 'react';
import { Modal } from 'antd';
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

const PreviewImage = styled.img`
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
`;

export function MediaGallery({ attachments }: MediaGalleryProps): React.JSX.Element | null {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const images = attachments.filter((a) => a.type === 'image');
  if (images.length === 0) return null;

  const previewImage = previewIndex !== null ? images[previewIndex] : null;

  return (
    <>
      <Grid>
        {images.map((image, index) => (
          <Thumbnail
            key={image.id}
            src={image.previewUrl}
            alt={image.description ?? ''}
            onClick={() => setPreviewIndex(index)}
          />
        ))}
      </Grid>
      <Modal
        open={previewImage !== null}
        onCancel={() => setPreviewIndex(null)}
        footer={null}
        centered
        width="auto"
        styles={{ body: { padding: 0, lineHeight: 0 } }}
      >
        {previewImage && (
          <PreviewImage src={previewImage.url} alt={previewImage.description ?? ''} />
        )}
      </Modal>
    </>
  );
}
