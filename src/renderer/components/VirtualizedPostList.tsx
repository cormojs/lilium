import { useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import styled from 'styled-components';
import type { Post } from '../../shared/types.ts';

interface VirtualizedPostListProps {
  posts: Post[];
  /** 行の高さの推定値 (px)。実際の高さは描画後に測定される */
  estimateRowHeight: number;
  header?: React.ReactNode;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
  listRef: React.RefObject<HTMLDivElement | null>;
  renderPost: (post: Post) => React.ReactNode;
}

const ScrollContainer = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const VirtualInner = styled.div`
  position: relative;
  width: 100%;
`;

const VirtualRow = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
`;

export function VirtualizedPostList({
  posts,
  estimateRowHeight,
  header,
  empty,
  footer,
  listRef,
  renderPost,
}: VirtualizedPostListProps): React.JSX.Element {
  // @tanstack/react-virtual は Virtualizer インスタンスを破壊的に更新するため、
  // React Compiler のメモ化と両立しない (インスタンスの参照が変わらず、スクロールしても
  // getVirtualItems() の呼び出しがキャッシュされたままになる)。静的解析では検出できない
  // 実行時の問題のため、lint 上は「不要」と判定されるがこの opt-out は必要
  // eslint-disable-next-line react-compiler/react-compiler
  'use no memo';

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const hasHeader = header !== undefined && header !== null;

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) {
      setHeaderHeight(0);
      return;
    }
    const update = (): void => {
      setHeaderHeight(el.offsetHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [hasHeader]);

  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 10,
    getItemKey: (index) => posts[index]?.id ?? index,
    scrollMargin: headerHeight,
  });

  return (
    <ScrollContainer ref={listRef}>
      {hasHeader ? <div ref={headerRef}>{header}</div> : null}
      {posts.length === 0 ? (
        empty
      ) : (
        <VirtualInner style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const post = posts[virtualItem.index];
            if (!post) return null;
            return (
              <VirtualRow
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{ transform: `translateY(${String(virtualItem.start - headerHeight)}px)` }}
              >
                {renderPost(post)}
              </VirtualRow>
            );
          })}
        </VirtualInner>
      )}
      {footer}
    </ScrollContainer>
  );
}
