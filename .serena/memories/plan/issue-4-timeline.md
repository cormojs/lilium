# Issue #4: TL(タイムライン)の描画プラン

## 概要
タイムラインを取得・描画する。タブで複数TLを並べられるようにし、投稿の表示を行う。

## 実装ステップ

### Step 1: 依存パッケージの追加
- `sanitize-html` をインストール (本文HTMLのサニタイズ用)
- `@types/sanitize-html` を devDependencies に追加

### Step 2: IPC チャンネル追加 (`src/shared/ipc.ts`)
- `TimelineFetch` — タイムライン取得 (home / public / favourites)
  - パラメータ: `{ serverUrl, accessToken, type, maxId? }`
  - レスポンス: `Post[]` (mastodon.v1.Status の必要フィールドを抽出)

### Step 3: 共通型定義 (`src/shared/types.ts`)
- `Post` 型を追加
  - `id: string`
  - `content: string` (HTML)
  - `createdAt: string` (ISO 8601)
  - `url: string | null` (投稿のオリジナルURL)
  - `account: { acct: string; displayName: string; avatarUrl: string }`
- `TimelineType` — `'home' | 'public' | 'favourites'`
- `TimelineFetchParams` — タイムライン取得リクエストパラメータ
- `TabDefinition` — タブの定義 `{ id: string; accountServerUrl: string; accountUsername: string; timelineType: TimelineType }`

### Step 4: メインプロセス — タイムライン取得 (`src/main/timeline.ts`)
- `fetchTimeline(serverUrl, accessToken, type, maxId?)` 関数を実装
  - `masto` の `createRestAPIClient` でクライアント生成
  - `type` に応じて `v1.timelines.home`, `v1.timelines.public`, `v1.favourites` を呼び分け
  - `mastodon.v1.Status` から `Post` 型にマッピングして返す

### Step 5: IPC ハンドラー登録 (`src/main/index.ts`)
- `TimelineFetch` ハンドラーを追加
  - アカウント情報を使ってタイムラインを取得

### Step 6: preload 拡張 (`src/preload/index.ts`)
- `fetchTimeline(params)` を `window.api` に追加

### Step 7: レンダラー — タイムラインページ (`src/renderer/pages/TimelinePage.tsx`)
- **タブ管理**:
  - Ant Design の `Tabs` コンポーネントを使用
  - 各タブに `TabDefinition` を紐づけ
  - 一番右に「+」ボタンを表示 → クリックで `Modal` (タブ追加ダイアログ) を表示
  - タブ追加ダイアログ: アカウント選択 (`Select`) + タイムライン種類選択 (`Select`)
- **投稿一覧**:
  - 各タブの内容として投稿リストを描画
  - useEffect でタブ切り替え時にタイムラインを取得

### Step 8: レンダラー — 投稿コンポーネント (`src/renderer/components/PostItem.tsx`)
- **レイアウト**: 左にアバター、右にコンテンツ (Flex)
- **アバター**: 48x48, 丸形
- **1行目**: acct(黒) + 表示名(灰色)
  - acct は `@username@server` 形式
- **2行目**: 本文 (sanitize-html でサニタイズ済みHTML)
  - `dangerouslySetInnerHTML` で表示
  - sanitize-html で基本的なタグを許可
- **3行目**: 投稿時刻 (`YYYY/MM/DD HH:mm:ss` 形式)
  - リンクとして表示、クリックで `url` をデフォルトブラウザで開く (shell.openExternal 相当の window.open)

### Step 9: ルーティング/画面遷移 (`src/renderer/App.tsx`)
- アカウントが0件 → LoginPage を表示
- アカウントが1件以上 → TimelinePage を表示
- LoginPage にログイン成功時のコールバックを追加してページ遷移

### Step 10: フォーマット・Lint
- `bun run format` と `bun run lint:fix` を実行
- `bun run typecheck` で型チェック

## UIデザイン

### タブ
```
[Home @alice@mastodon.social] [Public @bob@mstdn.jp] [+]
```

### 投稿アイテム
```
┌──────────────────────────────────────┐
│ [avatar]  @user@server  Display Name │
│           本文テキスト...             │
│           2026/03/13 13:45:59        │
└──────────────────────────────────────┘
```

## 技術的注意点
- sanitize-html はレンダラープロセスで使用 (ブラウザ環境で動作可能)
- mastodon API の呼び出しはメインプロセスで行う (IPC 経由)
- タブの状態はレンダラーの state で管理 (永続化は後で検討)
