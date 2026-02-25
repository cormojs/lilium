---
name: gh-cli
description: GitHub CLI (gh) を使った操作を行うスキル。PR の作成・レビュー・マージ、Issue の作成・管理、リポジトリのクローン・フォーク、GitHub Actions のワークフロー確認、リリース管理など、GitHub に関する操作全般を `gh` コマンドで実行する際に使用する。"PR を作って", "Issue を確認して", "CIのステータスを見て", "gh コマンドで" などのキーワードが含まれる場合に使用する。
---

# GitHub CLI (gh) スキル

`gh` コマンドを使って GitHub の操作を効率的に行う。

## 禁止事項

以下の操作は **絶対に実行しない**。ユーザーから明示的に指示されても行わない。

- **PR のマージ** (`gh pr merge`) — マージはユーザー自身が行う
- **Issue のクローズ** (`gh issue close`) — クローズはユーザー自身が行う

## 基本原則

- `gh` コマンドはカレントディレクトリのリポジトリを自動検出する
- 別のリポジトリを対象にする場合は `-R OWNER/REPO` フラグを使う
- JSON 出力が必要な場合は `--json` フラグと `--jq` を組み合わせる
- ブラウザで開く場合は `--web` フラグを使う

## PR (Pull Request) 操作

### PR を作成する
```bash
# インタラクティブに作成
gh pr create

# タイトルと本文を指定して作成
gh pr create --title "タイトル" --body "本文"

# git log からタイトル・本文を自動補完
gh pr create --fill

# ドラフトとして作成
gh pr create --draft --fill

# レビュアーとラベルを指定
gh pr create --reviewer username --label bug --fill
```

### PR を確認する
```bash
# 一覧表示
gh pr list

# 自分のPRのみ
gh pr list --author @me

# 特定のPRを表示
gh pr view 123
gh pr view                   # カレントブランチのPR

# CIチェックのステータス確認
gh pr checks 123
gh pr checks                 # カレントブランチのPR

# 差分を確認
gh pr diff 123
```

### PR を操作する
```bash
# レビューを追加
gh pr review 123 --approve
gh pr review 123 --request-changes --body "修正が必要です"
gh pr review 123 --comment --body "コメント"

# ブランチをチェックアウト
gh pr checkout 123

# ブランチを最新に更新
gh pr update-branch 123

# レビュー準備完了にマーク
gh pr ready 123

# クローズ・再オープン
gh pr close 123
gh pr reopen 123
```

## Issue 操作

### Issue を作成する
```bash
# インタラクティブに作成
gh issue create

# タイトルと本文を指定
gh issue create --title "バグ報告" --body "詳細"

# ラベルとアサインを指定
gh issue create --label bug --assignee username --title "タイトル"
```

### Issue を確認・管理する
```bash
# 一覧表示
gh issue list

# オープンな Issue のみ / ラベル指定
gh issue list --state open --label bug

# 特定の Issue を表示
gh issue view 456

# コメントを追加
gh issue comment 456 --body "対応します"

# 編集
gh issue edit 456 --title "新しいタイトル" --add-label enhancement
```

## リポジトリ操作

```bash
# リポジトリをクローン
gh repo clone OWNER/REPO

# フォーク（フォーク後にクローン）
gh repo fork OWNER/REPO --clone

# リポジトリ情報を表示
gh repo view OWNER/REPO

# ブラウザで開く
gh repo view --web

# 新しいリポジトリを作成
gh repo create my-repo --public
gh repo create my-repo --private --clone
```

## GitHub Actions 操作

### ワークフローラン確認
```bash
# 最近のランを一覧表示
gh run list

# 特定のランの詳細
gh run view RUN_ID

# ランが完了するまで監視
gh run watch RUN_ID

# 失敗したランを再実行
gh run rerun RUN_ID --failed

# ランをキャンセル
gh run cancel RUN_ID
```

### ワークフロー管理
```bash
# ワークフロー一覧
gh workflow list

# 特定のワークフローを手動実行
gh workflow run workflow.yml
gh workflow run workflow.yml --ref branch-name
```

## 検索

```bash
# リポジトリ検索
gh search repos "キーワード" --language go

# Issue 検索
gh search issues "バグ" --repo OWNER/REPO

# PR 検索
gh search prs "fix" --repo OWNER/REPO --state open

# コード検索
gh search code "関数名" --repo OWNER/REPO

# 除外クエリ（ハイフン付き修飾子）
gh search issues -- "query -label:wontfix"
```

## リリース管理

```bash
# リリース一覧
gh release list

# リリースを作成
gh release create v1.0.0 --title "v1.0.0" --notes "変更点"

# アセットをアップロードしてリリース
gh release create v1.0.0 ./dist/app.tar.gz

# リリース情報を表示
gh release view v1.0.0
```

## JSON 出力と jq の活用

```bash
# PR の JSON 出力
gh pr list --json number,title,state

# jq でフィルタリング
gh pr list --json number,title,author --jq '.[] | select(.author.login == "username")'

# Issue のタイトルのみ抽出
gh issue list --json title --jq '.[].title'
```

## API 直接呼び出し

```bash
# GitHub API を直接呼び出す
gh api repos/OWNER/REPO

# GraphQL クエリ
gh api graphql -f query='
  query {
    viewer {
      login
    }
  }
'

# POST リクエスト
gh api repos/OWNER/REPO/issues -f title="タイトル" -f body="本文"
```

## よく使うパターン

```bash
# 現在のリポジトリのステータス確認
gh status

# カレントブランチのPRを開く
gh pr view --web

# 全てのPRをレビュー待ち順に表示
gh pr list --search "is:open review:required"
```
