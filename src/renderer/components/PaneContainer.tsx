import { useRef, useCallback } from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import styled from 'styled-components';

interface PaneContainerProps {
  paneCount: number;
  widthRatios: number[];
  onWidthRatiosChange: (ratios: number[]) => void;
  onAddPane: (position: 'left' | 'right') => void;
  children: React.ReactNode[];
}

const Container = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
`;

const PaneWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 200px;
  min-height: 0;
  overflow: hidden;
`;

const Divider = styled.div`
  width: 4px;
  cursor: col-resize;
  background: #303030;
  flex-shrink: 0;
  transition: background 0.15s;

  &:hover {
    background: #1668dc;
  }
`;

const AddPaneButton = styled(Button)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 24px;
  height: 48px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  opacity: 0.4;
  transition: opacity 0.15s;

  &:hover {
    opacity: 1;
  }
`;

const AddPaneButtonLeft = styled(AddPaneButton)`
  left: 0;
`;

const AddPaneButtonRight = styled(AddPaneButton)`
  right: 0;
`;

export function PaneContainer({
  paneCount,
  widthRatios,
  onWidthRatiosChange,
  onAddPane,
  children,
}: PaneContainerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (dividerIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const startX = e.clientX;
      const startRatios = [...widthRatios];

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        const deltaX = moveEvent.clientX - startX;
        const deltaRatio = deltaX / containerWidth;

        const newRatios = [...startRatios];
        const leftRatio = (startRatios[dividerIndex] ?? 0) + deltaRatio;
        const rightRatio = (startRatios[dividerIndex + 1] ?? 0) - deltaRatio;

        const minRatio = 0.1;
        if (leftRatio < minRatio || rightRatio < minRatio) return;

        newRatios[dividerIndex] = leftRatio;
        newRatios[dividerIndex + 1] = rightRatio;
        onWidthRatiosChange(newRatios);
      };

      const handleMouseUp = (): void => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [widthRatios, onWidthRatiosChange],
  );

  const elements: React.ReactNode[] = [];
  for (let i = 0; i < paneCount; i++) {
    if (i > 0) {
      elements.push(
        <Divider key={`divider-${i}`} onMouseDown={(e) => handleMouseDown(i - 1, e)} />,
      );
    }
    elements.push(
      <PaneWrapper key={`pane-${i}`} style={{ flex: widthRatios[i] ?? 1 }}>
        {children[i]}
      </PaneWrapper>,
    );
  }

  return (
    <Container ref={containerRef}>
      <AddPaneButtonLeft
        type="default"
        icon={<PlusOutlined />}
        onClick={() => onAddPane('left')}
        title="左にペインを追加"
      />
      {elements}
      <AddPaneButtonRight
        type="default"
        icon={<PlusOutlined />}
        onClick={() => onAddPane('right')}
        title="右にペインを追加"
      />
    </Container>
  );
}
