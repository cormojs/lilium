# Issue #27: 設定画面の実装

## 概要
見た目の調整をするための設定画面を作る。以下の設定項目を実装する:
- アイコン画像の大きさ
- ブーストアイコン画像の大きさ
- TLの本文の文字の大きさ
- その他の文字の大きさ

## 実装プラン

### 1. 設定の型定義 (`src/shared/types.ts`)
`AppSettings` インターフェースを追加:
```ts
export interface AppSettings {
  avatarSize: number;       // デフォルト: 48
  boostAvatarSize: number;  // デフォルト: 25
  postFontSize: number;     // デフォルト: 14
  uiFontSize: number;       // デフォルト: 14
}
```

### 2. IPCチャンネル追加 (`src/shared/ipc.ts`)
- `SettingsLoad: 'settings:load'`
- `SettingsSave: 'settings:save'`

### 3. メインプロセス: 設定の永続化 (`src/main/settings.ts`)
`tabs.ts` と同じパターンで `settings.json` に保存:
- `loadSettings(): AppSettings` — ファイルから読み込み、デフォルト値でマージ
- `saveSettings(settings: AppSettings): void` — ファイルに書き込み

### 4. IPC ハンドラ登録 (`src/main/index.ts`)
- `SettingsLoad` → `loadSettings()`
- `SettingsSave` → `saveSettings(settings)`

### 5. プリロード (`src/preload/index.ts`)
- `loadSettings(): Promise<AppSettings>`
- `saveSettings(settings: AppSettings): Promise<void>`

### 6. 設定画面コンポーネント (`src/renderer/pages/SettingsPage.tsx`)
- Ant Design の `Slider` や `InputNumber` を使ってスライダーUI
- 各設定項目のプレビュー表示
- 「保存」ボタンで `window.api.saveSettings()` を呼ぶ
- 「リセット」ボタンでデフォルト値に戻す

### 7. 設定コンテキスト (`src/renderer/hooks/useSettings.ts`)
- React Context で設定値をアプリ全体に配信
- 起動時に `window.api.loadSettings()` で読み込み

### 8. App.tsx にルーティング追加
- `Page` 型に `'settings'` を追加
- `SettingsPage` へのナビゲーション

### 9. PostItem.tsx に設定値を反映
- `avatarSize`, `boostAvatarSize`, `postFontSize`, `uiFontSize` を styled-components の props として受け取る
- 固定値を設定値に置換

### 10. TimelinePage に設定ボタンを追加
- SettingOutlined ボタンのクリック先を設定画面に変更、またはアカウント管理ボタンとは別に設定ボタンを追加

## ファイル変更一覧
- `src/shared/types.ts` — `AppSettings` 型追加
- `src/shared/ipc.ts` — チャンネル追加
- `src/main/settings.ts` — 新規作成
- `src/main/index.ts` — ハンドラ登録
- `src/preload/index.ts` — API追加
- `src/renderer/hooks/useSettings.ts` — 新規作成
- `src/renderer/pages/SettingsPage.tsx` — 新規作成
- `src/renderer/App.tsx` — ルーティング追加、コンテキスト配信
- `src/renderer/components/PostItem.tsx` — 設定値反映
- `src/renderer/components/NotificationItem.tsx` — 設定値反映(PostItemを使っていれば不要かも)
- `src/renderer/pages/TimelinePage.tsx` — 設定ボタン追加
