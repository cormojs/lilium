# Issue #12: マルチペイン化 実装プラン

## 概要
横にペインを並べる画面分割を可能にする。ペインのサイズはユーザーが調節可能で保存される。

## 要件
1. 複数ペインを横並びに表示
2. ペインサイズをドラッグで調節可能 → サイズを永続化
3. 左端・右端に新しいペインの追加ボタン
4. タブラベルの左端を押すと左右のペインに移動する選択肢を表示

## データモデル

### 新しい型 (`src/shared/types.ts`)
```typescript
interface PaneDefinition {
  id: string;
  tabIds: string[];       // このペイン内のタブID一覧（順序付き）
  activeTabId: string;    // このペインでアクティブなタブ
  widthRatio: number;     // ペインの幅比率（合計を1.0として正規化）
}

interface PaneLayout {
  panes: PaneDefinition[];
}
```

- `TabDefinition` は変更なし（既存のまま）
- `PaneLayout` がどのタブがどのペインにあるかを管理

## 実装ステップ

### Step 1: 型定義の追加
- `src/shared/types.ts` に `PaneDefinition`, `PaneLayout` を追加

### Step 2: IPC チャンネルの追加
- `src/shared/ipc.ts` に `PaneLayoutSave`, `PaneLayoutLoad` チャンネルを追加

### Step 3: メインプロセスにペインレイアウト永続化を追加
- `src/main/panes.ts` を新規作成 — `pane-layout.json` への読み書き
- `src/main/index.ts` に IPC ハンドラを登録

### Step 4: プリロードにAPI追加
- `src/preload/index.ts` に `savePaneLayout` / `loadPaneLayout` を追加
- `window.api` の型定義も更新

### Step 5: リサイズ可能なペインコンテナの実装
- `src/renderer/components/PaneContainer.tsx` を新規作成
  - flexbox で横並びレイアウト
  - ペイン間にドラッグ可能なディバイダー（幅4px程度）
  - ドラッグでペインの `widthRatio` を調節
  - 左端・右端に「＋」ボタンでペイン追加

### Step 6: TimelinePage のリファクタリング
- 現在の単一 `Tabs` を `PaneContainer` + 複数 `Pane` に変更
- 各ペインが独自の `Tabs` コンポーネントを持つ
- タブの追加は対象ペイン内で行う
- タブの削除時、ペインが空になったらペインも削除（最後の1ペインは残す）

### Step 7: タブ移動機能の実装
- タブラベルの左端にアイコンボタンを追加
- クリックで Dropdown メニュー表示：「左のペインへ移動」「右のペインへ移動」
- 移動先ペインがない場合は新しいペインを作成して移動

### Step 8: レイアウト永続化
- ペインレイアウト変更時（リサイズ・タブ移動・ペイン追加/削除）に `savePaneLayout` を呼ぶ
- 起動時に `loadPaneLayout` でレイアウトを復元

## ファイル変更一覧
- `src/shared/types.ts` — 型追加
- `src/shared/ipc.ts` — IPCチャンネル追加
- `src/main/panes.ts` — 新規: ペインレイアウト永続化
- `src/main/index.ts` — IPCハンドラ登録
- `src/preload/index.ts` — API追加
- `src/renderer/components/PaneContainer.tsx` — 新規: リサイズ可能なペインコンテナ
- `src/renderer/pages/TimelinePage.tsx` — マルチペイン対応にリファクタリング
