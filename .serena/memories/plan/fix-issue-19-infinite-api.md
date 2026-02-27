# Fix: 無限スクロールがAPIを呼び続けるバグ

## 原因分析
無限ループの原因は依存関係の循環:

1. `loadMore` の deps に `posts` と `loadingMore` が含まれる
2. `loadMore` 実行 → `setPosts` で `posts` が更新 → `loadMore` が再生成（新しい参照）
3. `useEffect` の deps が `[loadMore]` → effect再実行 → `checkAndLoad()` が即座に呼ばれる
4. スクロール位置が末尾付近なら再度 `loadMore` が発火 → 2に戻る

APIが空配列を返しても、`loadingMore` が true→false に変わるため `loadMore` が再生成され、
effectが再実行されて `checkAndLoad()` → 再度API呼び出し、の無限ループになる。

## 修正方針
1. `posts` を ref で参照し `loadMore` の deps から除去
2. `loadingMore` も ref で管理し deps から除去
3. `hasMore` state を追加: APIが空配列を返したら false にし、以降の追加ロードを抑止
4. `hasMore` が変わっても effect は再実行不要なので ref で管理

これにより `loadMore` の参照が安定し、useEffect の不要な再実行を防ぐ。

## 対象ファイル
- `src/renderer/pages/TimelinePage.tsx`（TimelineTabContent, NotificationTabContent）
