# Issue #54: APIクライアントの規制対策

## 課題
- 各API呼び出しで毎回 `createRestAPIClient` を新規生成しており、レート制限の考慮がない
- 短時間に大量のリクエストを送るとサーバーから規制される可能性がある

## 現状のAPIクライアント使用箇所
- `src/main/timeline.ts` — fetchTimeline: 毎回新規生成
- `src/main/statuses.ts` — 7関数すべてで毎回新規生成
- `src/main/notifications.ts` — fetchNotifications: 毎回新規生成
- `src/main/oauth.ts` — startLogin, exchangeToken: 毎回新規生成（OAuthは対象外でよい）
- `src/main/streaming.ts` — getStreamingApiUrl, pollUserStream, pollPublicStream: 毎回/subscription単位で生成

## 設計方針

### 1. `src/main/apiClient.ts` を新設
- `serverUrl` をキーとしてREST APIクライアントをキャッシュする共有クライアントマネージャー
- リクエストにレート制限を適用するラッパー
- Mastodon APIのデフォルトレート制限: 300リクエスト/5分 (= 1リクエスト/秒程度)
- トークンバケット方式で実装: サーバーURL単位で管理

### 2. トークンバケットによるレート制限
```
class TokenBucket:
  - capacity: 最大トークン数 (例: 300)
  - tokens: 現在のトークン数
  - refillRate: トークン補充レート (例: 1トークン/秒 = 300/5分)
  - lastRefill: 最後の補充時刻
  
  acquire(): Promise<void>
    - トークンがあれば即座に消費
    - なければトークンが補充されるまで待機
```

### 3. APIクライアントマネージャー
```
getRestClient(serverUrl, accessToken): mastodon.rest.Client
  - キーは `${serverUrl}::${accessToken}` 
  - キャッシュされたクライアントがあればそれを返す
  - なければ createRestAPIClient で生成してキャッシュ

withRateLimit<T>(serverUrl, fn: () => Promise<T>): Promise<T>
  - serverUrl単位のTokenBucketを取得/生成
  - bucket.acquire() を待ってから fn() を実行
```

### 4. 各ファイルの修正
- `timeline.ts`: `createRestAPIClient` → `getRestClient` + `withRateLimit`
- `statuses.ts`: 同上
- `notifications.ts`: 同上
- `streaming.ts`: ポーリング用クライアントを `getRestClient` に置き換え、`withRateLimit` で制限
- `oauth.ts`: ログインは頻度が低いのでレート制限対象外、ただしクライアントキャッシュは利用可能

## 対象ファイル
- 新規: `src/main/apiClient.ts`
- 修正: `src/main/timeline.ts`, `src/main/statuses.ts`, `src/main/notifications.ts`, `src/main/streaming.ts`
