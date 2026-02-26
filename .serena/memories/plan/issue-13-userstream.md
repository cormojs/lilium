# Issue #13: UserStream (WebSocket リアルタイム配信) 対応

## 概要
Mastodon の Streaming API (WebSocket) を利用して、タイムラインと通知のリアルタイム更新に対応する。

## 技術方針
- masto ライブラリの `createStreamingAPIClient` を使用
- メインプロセスで WebSocket 接続を管理し、イベントを IPC 経由でレンダラーに送る
- レンダラーは `ipcRenderer.on` でイベントを受け取り、既存リストの先頭に追加

## Mastodon Streaming API のストリーム種別
- `user` ストリーム: ホームタイムラインの新規投稿 (`update`) + 通知 (`notification`)
- `public` ストリーム: 公開タイムラインの新規投稿 (`update`)
- `favourites` にはストリーミング対応なし

## 実装ステップ

### Step 1: IPC チャンネル追加 (`src/shared/ipc.ts`)
- `StreamSubscribe: 'stream:subscribe'` — ストリーム購読開始 (invoke)
- `StreamUnsubscribe: 'stream:unsubscribe'` — ストリーム購読停止 (invoke)
- `StreamEvent: 'stream:event'` — メインからレンダラーへのイベント送信 (send)

### Step 2: ストリーム型定義追加 (`src/shared/types.ts`)
- `StreamSubscribeParams` — { serverUrl, accessToken, streamType: 'user' | 'public', subscriptionId }
- `StreamEvent` — { subscriptionId, event: 'update' | 'notification' | 'delete', payload: Post | MastoNotification | string }

### Step 3: メインプロセスにストリーミングモジュール追加 (`src/main/streaming.ts`)
- `subscribeStream(params, webContents)`: WebSocket 接続を開始し、イベントを `webContents.send` で送る
- `unsubscribeStream(subscriptionId)`: 接続を閉じる
- 接続管理: Map<subscriptionId, subscription> で管理
- イベント受信時に Post / MastoNotification 型に変換してから送信

### Step 4: IPC ハンドラ登録 (`src/main/index.ts`)
- `StreamSubscribe` / `StreamUnsubscribe` のハンドラを追加

### Step 5: プリロード API 追加 (`src/preload/index.ts`)
- `subscribeStream(params)` — invoke
- `unsubscribeStream(subscriptionId)` — invoke
- `onStreamEvent(callback)` — ipcRenderer.on でリスナー登録、unsubscribe 関数を返す

### Step 6: レンダラー側の更新 (`src/renderer/pages/TimelinePage.tsx`)
- `TimelineTabContent`: マウント時に適切なストリーム (`user` or `public`) を subscribe し、`update` イベントで投稿を先頭に追加。アンマウント時に unsubscribe
- `NotificationTabContent`: `user` ストリームを subscribe し、`notification` イベントで通知を先頭に追加
- subscriptionId はタブ ID を使用

## 注意事項
- 同一アカウントの `user` ストリームは重複接続しないよう管理する（home と notifications で共有）
- WebSocket の再接続ロジックは masto ライブラリが提供する範囲に委ねる
- `delete` イベントも処理して、削除された投稿をリストから除去する
