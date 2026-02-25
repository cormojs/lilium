# Issue #7: ログイン画面の実装プラン

## 概要
ログイン画面を実装し、Mastodon OAuthフローでアカウント追加できるようにする。

## Mastodon OAuth フロー
1. `POST /api/v1/apps` でアプリ登録 → `client_id`, `client_secret` 取得
2. `GET /oauth/authorize` のURLをユーザーに提示 → ブラウザで認可
3. `redirect_uri=urn:ietf:wg:oauth:2.0:oob` を使用 → ユーザーが認可コードを手動コピー
4. `POST /oauth/token` で認可コード → アクセストークン交換
5. `GET /api/v1/accounts/verify_credentials` で認証確認

## 実装ファイル一覧

### 1. `src/shared/ipc.ts` — IPCチャンネル定義
- `oauth:register-app` — アプリ登録
- `oauth:get-auth-url` — 認可URL取得
- `oauth:exchange-token` — トークン交換
- `accounts:list` — アカウント一覧取得
- `accounts:verify` — アカウント情報確認

### 2. `src/shared/types.ts` — 共通型定義
- `Account` 型 (serverUrl, accessToken, username, displayName, avatar)
- IPC リクエスト/レスポンス型

### 3. `src/main/oauth.ts` — OAuth処理 (メインプロセス)
- `masto` の `createRestAPIClient` で `/api/v1/apps` を呼びアプリ登録
- 認可URLの構築
- `createOAuthAPIClient` で `oauth.token.create` を呼びトークン交換
- `createRestAPIClient` でアカウント情報取得 (`verify_credentials`)

### 4. `src/main/accounts.ts` — アカウント管理 (メインプロセス)
- アカウント一覧の保存・読み込み (Electronの `safeStorage` + ファイル)
- アカウントの追加・削除

### 5. `src/main/index.ts` — IPCハンドラー登録
- `ipcMain.handle` で各IPCチャンネルを登録

### 6. `src/preload/index.ts` — contextBridge拡張
- `window.api` に OAuth/アカウント関連メソッドを公開

### 7. `src/renderer/pages/LoginPage.tsx` — ログイン画面UI
- サーバーURL入力 + 「ログイン開始」ボタン
- OAuthリンク表示 (ブラウザで開く + コピーボタン)
- 認可コード入力 + 「ログイン完了」ボタン
- ログイン済みアカウント一覧表示

### 8. `src/renderer/App.tsx` — LoginPageの組み込み

## UI設計 (Ant Design使用)
- `Input` + `Button` でサーバーURL入力
- `Steps` コンポーネントでOAuthフローのステップ表示
- `List` コンポーネントでアカウント一覧
- `Typography.Link` + `Button` (コピー) でOAuthリンク表示
- `Input` + `Button` で認可コード入力

## セキュリティ
- `redirect_uri` は `urn:ietf:wg:oauth:2.0:oob` (OOBフロー)
- アクセストークンは `safeStorage` で暗号化保存
- `contextIsolation: true` を維持
