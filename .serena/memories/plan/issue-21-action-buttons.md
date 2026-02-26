# Issue #21: お気に入り・ブースト・ブックマークボタンの表示

## 概要
ポストの下部、投稿時刻の右側にお気に入りボタンとブーストボタンとブックマークボタンを表示する。

## 実装プラン

### 1. Post型にアクション状態を追加 (`src/shared/types.ts`)
`Post` に以下のフィールドを追加:
- `favourited: boolean`
- `reblogged: boolean`
- `bookmarked: boolean`

### 2. アクション用の型・IPCチャンネルを追加 (`src/shared/types.ts`, `src/shared/ipc.ts`)
- `StatusActionParams { serverUrl, accessToken, statusId }` 型を追加
- IPCチャンネル: `StatusFavourite`, `StatusUnfavourite`, `StatusReblog`, `StatusUnreblog`, `StatusBookmark`, `StatusUnbookmark`

### 3. メインプロセスにAPI呼び出しを実装 (`src/main/statuses.ts`)
masto ライブラリで以下を実装:
- `favouriteStatus(serverUrl, accessToken, statusId)`
- `unfavouriteStatus(serverUrl, accessToken, statusId)`
- `reblogStatus(serverUrl, accessToken, statusId)`
- `unreblogStatus(serverUrl, accessToken, statusId)`
- `bookmarkStatus(serverUrl, accessToken, statusId)`
- `unbookmarkStatus(serverUrl, accessToken, statusId)`

### 4. IPCハンドラ登録 (`src/main/index.ts`)

### 5. プリロードAPI追加 (`src/preload/index.ts`)

### 6. PostItem にボタンUIを追加 (`src/renderer/components/PostItem.tsx`)
- 投稿時刻の右側にアイコンボタンを横並びで表示
- お気に入り: HeartOutlined / HeartFilled (赤)
- ブースト: RetweetOutlined (緑)
- ブックマーク: BookOutlined / BookFilled (青)
- ボタン押下でIPC経由でAPIを呼び、ローカル状態をトグル
- PostItem は serverUrl と accessToken が必要 → props で渡す

### 7. timeline.ts のマッピングでアクション状態を含める (`src/main/timeline.ts`)
`favourited`, `reblogged`, `bookmarked` をPostオブジェクトに含める

### 8. TimelinePage から PostItem に account 情報を渡す (`src/renderer/pages/TimelinePage.tsx`)

## ファイル変更一覧
- `src/shared/types.ts` — Post型拡張, StatusActionParams追加
- `src/shared/ipc.ts` — チャンネル追加
- `src/main/statuses.ts` — API呼び出し追加
- `src/main/index.ts` — ハンドラ登録
- `src/main/timeline.ts` — マッピングにfavourited/reblogged/bookmarked追加
- `src/preload/index.ts` — API追加
- `src/renderer/components/PostItem.tsx` — ボタンUI追加
- `src/renderer/pages/TimelinePage.tsx` — account props追加
