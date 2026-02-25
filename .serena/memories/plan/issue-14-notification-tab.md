# Issue #14: 通知タブの追加プラン

## 概要
タイムラインの追加ダイアログで「通知」タブを追加できるようにする。
対応する通知タイプ: フォロー、フォローリクエスト、お気に入り、ブースト

## 実装方針

通知はタイムライン(Post[])とはデータ構造が異なるため、専用の型・取得ロジック・表示コンポーネントが必要。
TabDefinition の timelineType を拡張して 'notifications' を追加し、通知タブの場合は専用コンテンツを表示する。

## 実装ステップ

### Step 1: 共通型定義の追加 (`src/shared/types.ts`)
- `TimelineType` に `'notifications'` を追加
- `Notification` 型を新規追加:
  ```ts
  export type NotificationType = 'follow' | 'follow_request' | 'favourite' | 'reblog';
  export interface MastoNotification {
    id: string;
    type: NotificationType;
    createdAt: string;
    account: { acct: string; displayName: string; avatarUrl: string };
    /** お気に入り・ブーストの場合、対象の投稿 */
    status?: Post;
  }
  ```
- `NotificationFetchParams` 型を追加(serverUrl, accessToken, maxId?)

### Step 2: IPC チャンネル追加 (`src/shared/ipc.ts`)
- `NotificationsFetch: 'notifications:fetch'` を追加

### Step 3: メインプロセス — 通知取得 (`src/main/notifications.ts`)
- `fetchNotifications(serverUrl, accessToken, maxId?)` 関数を実装
  - `masto` の `client.v1.notifications.list()` を使用
  - フィルタ: `types: ['follow', 'follow_request', 'favourite', 'reblog']`
  - `mastodon.v1.Notification` → `MastoNotification` にマッピング

### Step 4: IPC ハンドラー登録 (`src/main/index.ts`)
- `NotificationsFetch` ハンドラーを追加

### Step 5: preload 拡張 (`src/preload/index.ts`)
- `fetchNotifications(params)` を `window.api` に追加

### Step 6: 通知アイテムコンポーネント (`src/renderer/components/NotificationItem.tsx`)
- 通知タイプに応じた表示:
  - follow: 「{user}にフォローされました」
  - follow_request: 「{user}からフォローリクエスト」
  - favourite: 「{user}がお気に入りに追加」+ 対象投稿のプレビュー
  - reblog: 「{user}がブースト」+ 対象投稿のプレビュー

### Step 7: 通知タブコンテンツ (`src/renderer/pages/TimelinePage.tsx`)
- `NotificationTabContent` コンポーネントを追加
  - TimelineTabContent と同様の構造だが、通知用のAPIを呼び出し
  - NotificationItem で各通知を表示
- タブの children で timelineType === 'notifications' の場合に NotificationTabContent を使用

### Step 8: タブ追加ダイアログの拡張 (`src/renderer/pages/TimelinePage.tsx`)
- `TIMELINE_TYPE_LABELS` に `notifications: 'Notifications'` を追加
- `timelineTypeOptions` に `{ value: 'notifications', label: 'Notifications' }` を追加

### Step 9: フォーマット・Lint・型チェック
- `bun run format` + `bun run lint:fix` + `bun run typecheck`

## 技術的注意点
- 通知APIは `client.v1.notifications.list({ types: [...] })` で呼べる
- TabDefinition の timelineType を 'home' | 'public' | 'favourites' | 'notifications' に拡張
- TimelineFetchParams は通知には使わない(専用の NotificationFetchParams を用意)
