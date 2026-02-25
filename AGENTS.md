# lilium — コーディングエージェント向け指示

## プロジェクト概要

**lilium** は Electron + React で動作する Mastodon クライアントです。

- **処理系**: Bun
- **言語**: TypeScript (strict モード)
- **UI フレームワーク**: React
- **実行環境**: Electron

---

## ランタイム・パッケージ管理

Bun はビルド・開発ツールとして使用します。npm / yarn / pnpm は使用しません。

```sh
bun install          # 依存関係のインストール
bun run <script>     # scripts の実行
bun test             # テストの実行
```

> **注意**: Electron のメインプロセスは Node.js、レンダラープロセスは Chromium 上で動作します。
> **`Bun.*` / `bun:*` などの Bun 独自 API はプログラム内で使用しないでください。**
> 実行時に利用できず、互換性が壊れます。標準の Node.js API または Web 標準 API を使用してください。

---

## プロジェクト構成

```
lilium/
├── src/
│   ├── main/          # Electron メインプロセス
│   ├── renderer/      # React フロントエンド (レンダラープロセス)
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   ├── preload/       # Electron プリロードスクリプト
│   └── shared/        # メイン・レンダラー共通の型定義・ユーティリティ
├── assets/
├── AGENTS.md
├── CLAUDE.md
├── package.json
└── tsconfig.json
```

---

## TypeScript

- `tsconfig.json` の設定に従う (`strict: true`)
- `any` 型の使用は避ける。やむを得ない場合は `// eslint-disable-next-line` コメントと理由を添える
- `import type` を型のみのインポートに使用する (`verbatimModuleSyntax: true`)
- ファイル拡張子付きのインポートパスを使用する (例: `./foo.ts`)

---

## ESLint / Prettier

### Prettier

コードフォーマットは Prettier に委ねます。手動での整形は行いません。

```sh
bun run format       # prettier --write "src/**/*.{ts,tsx}"
bun run format:check # prettier --check "src/**/*.{ts,tsx}"
```

主な設定方針:
- セミコロンあり
- シングルクォート
- trailing comma: `all`
- printWidth: `100`

### ESLint

```sh
bun run lint         # eslint src/
bun run lint:fix     # eslint src/ --fix
```

- ESLint エラーを残したままコミットしない
- `eslint-disable` コメントは最小限にとどめ、理由を明記する

---

## Electron アーキテクチャ

- **メインプロセス** (`src/main/`): Node.js API・OS 機能へのアクセス
- **レンダラープロセス** (`src/renderer/`): React UI。Node.js API に直接アクセスしない
- **プリロード** (`src/preload/`): `contextBridge` を通じてメインとレンダラーを安全に繋ぐ
- `contextIsolation: true` / `nodeIntegration: false` を維持してセキュリティを確保する
- IPC 通信は `ipcMain` / `ipcRenderer` を使用し、チャンネル名と型を `src/shared/ipc.ts` で一元管理する

---

## React

- 関数コンポーネントのみ使用する (クラスコンポーネント不可)
- カスタムフックは `src/renderer/hooks/` に配置する
- コンポーネントは単一責任を意識して小さく保つ
- props の型は `interface` で定義する

---

## Mastodon API

- Mastodon REST API および Streaming API を使用する
- API クライアントは `src/shared/` または `src/main/` に実装する
- アクセストークンなどの機密情報は Electron の `safeStorage` で暗号化して保存する
- レート制限のレスポンスヘッダー (`X-RateLimit-*`) を尊重した実装を行う

---

## テスト

```sh
bun test             # 全テストを実行
bun test <file>      # 特定ファイルのテストを実行
```

- テストファイルは対象ファイルと同階層に `*.test.ts` / `*.test.tsx` として配置する
- `bun:test` の `test` / `expect` / `mock` を使用する (`jest` / `vitest` は不要)

---

## コミット規約

コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) に従います。

```
feat: タイムラインの無限スクロールを実装
fix: 通知が重複して表示されるバグを修正
refactor: IPC チャンネル定義を shared/ipc.ts に集約
chore: eslint の設定を追加
```

---

## やってはいけないこと

- `npm` / `yarn` / `pnpm` の使用
- `Bun.*` / `bun:*` などの Bun 独自 API をプログラム内で使用すること (互換性が壊れる)
- レンダラープロセスから直接 Node.js API を呼び出すこと
- `nodeIntegration: true` に変更すること
- 型安全性を損なう `any` の多用
- ESLint エラーや TypeScript エラーを無視したコミット
