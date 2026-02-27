import { useState } from 'react';
import { Modal } from 'antd';
import styled from 'styled-components';
import type { PostMediaAttachment } from '../../shared/types.ts';

interface MediaGalleryProps {
  attachments: PostMediaAttachment[];
  hidden?: boolean;
  onReveal?: () => void;
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

const HiddenMediaButton = styled.button`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background: #fafafa;
  color: #595959;
  cursor: pointer;

  &:hover {
    border-color: #1677ff;
    color: #1677ff;
  }
`;

const PreviewImage = styled.img`
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
`;

export function MediaGallery({
  attachments,
  hidden = false,
  onReveal,
}: MediaGalleryProps): React.JSX.Element | null {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const images = attachments.filter((a) => a.type === 'image');
  if (images.length === 0) return null;

  if (hidden) {
    return <HiddenMediaButton onClick={onReveal}>センシティブ画像を表示</HiddenMediaButton>;
  }

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
