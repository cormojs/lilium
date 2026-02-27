# Issue #19: 無限スクロールの実装

## 概要
タイムラインや通知を一番下までスクロールしたら更に過去の内容を取得する。

## 現状
- `fetchTimeline` / `fetchNotifications` は既に `maxId` パラメータをサポート
- IPC経由で `maxId` も渡せる状態
- フロントエンド側でスクロール検知と追加読み込みが未実装

## 実装方針

### TimelineTabContent の変更
1. `loadingMore` state を追加（追加読み込み中フラグ）
2. `loadMore` 関数を追加: 現在のpostsの最後のIDを `maxId` として `fetchTimeline` を呼び、結果をappend
3. `TimelineList` のスクロールイベントを監視し、最下部付近に達したら `loadMore` を呼ぶ
4. 読み込み中は `Spin` を最下部に表示

### NotificationTabContent の変更
同様に `maxId` を使った追加読み込みを実装。

### スクロール検知
- `TimelineList` に `onScroll` ハンドラを設定
- `scrollTop + clientHeight >= scrollHeight - threshold` で判定
- `useRef` でスクロール要素を参照

## 対象ファイル
- `src/renderer/pages/TimelinePage.tsx`（TimelineTabContent, NotificationTabContent）
