# lilium

Electron + React で動作する Mastodon デスクトップクライアントです。

## 主な機能

- 複数アカウント対応
- タイムラインのリアルタイム更新 (Streaming API)

## 必要なもの

- [Bun](https://bun.sh/) v1 以上

## セットアップ

```sh
bun install
```


## ビルド

```sh
# アプリケーションのビルド
bun run build

# 配布用パッケージの作成
bun run package

# Windows 向けパッケージの作成
bun run package:win
```