# Issue #46: 書き込みエリアを縮小する

## 概要
トゥートボタンと公開範囲の設定を本文欄の右に置くことで書き込みコンポーネントの高さを縮小する。

## 現状のレイアウト
```
[Avatar] [     TextArea      ]
         [Select]    [Button]
```
- TextArea の下に FooterRow があり、Select（公開範囲）と Button（トゥート）が横並び
- FooterRow の分だけ高さが大きくなっている

## 変更後のレイアウト
```
[Avatar] [   TextArea   ] [Select]
                          [Button]
```
- TextArea の右側に公開範囲 Select とトゥートボタンを縦に配置
- FooterRow を廃止し、ComposerRight 内で TextArea と操作パネルを横並びにする

## 実装手順

### 1. styled-components の変更
- `FooterRow` を削除
- `ComposerRight` を flex 横並びに変更（TextArea部分 + 操作パネル部分）
- 新しい `ActionColumn` styled-component を追加（Select + Button を縦に並べる）

### 2. Composer コンポーネントの JSX 変更
- `ComposerRight` 内を TextArea と ActionColumn の横並びに変更
- ActionColumn 内に Select と Button を縦に配置
- Select の幅を調整（コンパクトに）

## 対象ファイル
- `src/renderer/components/Composer.tsx`
