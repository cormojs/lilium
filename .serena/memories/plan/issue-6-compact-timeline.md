# Issue #6: TLの縮小表示の実装

## 概要
1ポスト分の表示が1行になるような超縮小表示を実装する。

## 要件
- デフォルトは縮小表示（1行）
- クリックすると通常のフル表示になる
- 別のポストをクリックすると他のポストは縮小表示に戻る
- 縮小表示はグリッド型レイアウトで固定幅
  - アイコンセル: 緑背景
  - アカウント名セル: 黄色背景
  - 本文セル: 水色背景
- アイコンを横長に細くクロップして一番左に表示
- acctのホスト名を省略してその右に表示
- 本文をその右に1行で表示（長い場合は「...」で切る）
- フル表示でユーザーアイコンをクリックすると縮小表示に戻る
- 画像添付がある場合は右端に画像アイコンを表示

## 実装方針

### 1. CompactPostItem コンポーネントの新規作成
`src/renderer/components/CompactPostItem.tsx`

- 縮小表示用の1行コンポーネント
- グリッドレイアウト: `[アイコン(24px)] [acct(120px)] [本文(flex)] [画像アイコン(24px)]`
- 各セルに背景色を設定（緑/黄色/水色）
- アイコンは横長にクロップ（object-fit: cover, 幅24px, 高さ16px程度）
- acctはホスト名を省略（`@` + ユーザー名のみ）
- 本文はHTMLからテキスト抽出し、1行に制限（text-overflow: ellipsis）
- 画像添付がある場合は PictureOutlined アイコンを右端に表示
- クリックで `onExpand` コールバックを呼ぶ

### 2. TimelineTabContent の状態管理
- `expandedPostId` state を追加（展開中のポストID、null で全て縮小）
- ポストクリックで `expandedPostId` を更新
- 展開中のポストは既存の `PostItem` で表示
- フル表示の PostItem のアイコンクリックで縮小に戻す

### 3. PostItem の変更
- `onCollapse` prop を追加
- アバタークリックで `onCollapse` を呼ぶ（cursor: pointer に）

## 対象ファイル
- `src/renderer/components/CompactPostItem.tsx` (新規)
- `src/renderer/components/PostItem.tsx` (onCollapse prop 追加)
- `src/renderer/pages/TimelinePage.tsx` (expandedPostId 状態管理)
