# note-publisher 使い方ガイド

`articles/` にMarkdownファイルを置いてpushすると、note.com に記事が自動公開される。

## セットアップ

### 1. 依存インストール

```bash
pnpm install
npx playwright install chromium
```

### 2. 認証情報の設定

2つの認証方式がある。**Cookie方式を推奨**（ログインAPIはCAPTCHAで弾かれる場合がある）。

#### Cookie方式（推奨）

ブラウザの開発者ツールから note.com のセッションCookieを取得する。

**手順（Chrome / Edge の場合）:**

1. ブラウザで [note.com](https://note.com) にアクセスし、**ログイン済みの状態**にする
2. note.com のページ上で **F12** キーを押す（開発者ツールが開く）
3. 開発者ツール上部のタブから **Application**（アプリケーション）を選択する
   - 見つからない場合は `>>` をクリックして隠れたタブを表示する
4. 左パネルの **Storage** セクションにある **Cookies** を展開する
5. **`https://note.com`** をクリックする
6. 右側の一覧から、**Name** 列が `_note_session_v5` の行を探す
7. その行の **Value** 列の値をダブルクリックして全選択し、コピーする

**ローカルで使う場合:**

```bash
export NOTE_COOKIE="_note_session_v5=ここにコピーした値を貼る"
```

**GitHub Actions で使う場合（後述）:**

Secret の Value に `_note_session_v5=ここにコピーした値を貼る` を設定する。

> Cookie名（`_note_session_v5`）はバージョンアップで変わる可能性がある。
> 見つからない場合は `_note_session` で始まる名前を探すこと。

**Firefox の場合:**

手順3で **Storage**（ストレージ）タブ → **Cookie** → `https://note.com` を選択する。それ以外は同じ。

#### Email/Password方式

```bash
export NOTE_EMAIL="your-email@example.com"
export NOTE_PASSWORD="your-password"
```

> パスワードに `$` `"` `\` などの特殊文字が含まれる場合、シェルやGitHub Actionsで正しく展開されないことがある。
> その場合はCookie方式を使うこと。

> `NOTE_COOKIE` が設定されている場合はCookie方式が優先される。

### 3. GitHub Actions で使う場合

リポジトリの認証情報は GitHub Secrets に登録する。

**設定手順:**

1. GitHubでリポジトリページを開く
2. 上部の **Settings** タブをクリック
3. 左メニューの **Secrets and variables** → **Actions** をクリック
4. **New repository secret** ボタンをクリック
5. 以下の情報を登録する:

| Secret の Name | Secret の Value | 必須 |
|----------------|-----------------|------|
| `NOTE_COOKIE` | `_note_session_v5=コピーした値`（上の手順で取得） | 推奨 |
| `NOTE_EMAIL` | note.com のメールアドレス | Cookie未設定時 |
| `NOTE_PASSWORD` | note.com のパスワード | Cookie未設定時 |

> Cookieには有効期限がある。投稿が失敗した場合は、再度ブラウザからCookieを取得してSecretを更新すること。

## 記事の書き方

`articles/` ディレクトリに `.md` ファイルを作成する。

```markdown
---
title: "記事タイトル"
---

## 見出し

本文をMarkdownで記述する。

- 箇条書きも使える
- 複数項目OK

> 引用文

**太字**、*斜体*、~~取り消し線~~が使える。
```

### frontmatter

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `title` | Yes | 記事タイトル（文字列） |

### 使えるMarkdown書式

| 書式 | 記法 |
|------|------|
| 大見出し | `## 見出し` |
| 小見出し | `### 見出し` |
| 太字 | `**太字**` |
| 斜体 | `*斜体*` |
| 取り消し線 | `~~取り消し~~` |
| 引用 | `> 引用文` |
| 箇条書き | `- 項目` |
| 番号付きリスト | `1. 項目` |
| コードブロック | ` ``` ` で囲む |
| 区切り線 | `---` |
| リンク | `[テキスト](URL)` |
| 画像 | `![代替テキスト](URL)` |

### 使えない書式

note.com が対応していないため、以下は変換時に除去・変換される:

- **テーブル** → 非対応
- **`# h1`** → `## h2` に自動変換
- **`#### h4`〜`###### h6`** → `### h3` に自動変換
- **インラインコード** → プレーンテキスト化
- **ネストしたリスト** → フラット化

詳細は [docs/note-format.md](./note-format.md) を参照。

## コマンド

| コマンド | 説明 |
|----------|------|
| `just test` | テスト実行 |
| `just test-watch` | テスト（ウォッチモード） |
| `just publish` | 手動で記事を投稿（git diff HEAD~1 の差分が対象） |

## ワークフロー

### 自動投稿（GitHub Actions）

1. `articles/` に `.md` ファイルを作成・編集
2. `main` ブランチにpush
3. GitHub Actions が起動し、差分のあるMarkdownファイルを note.com に自動投稿

### 手動投稿（ローカル）

```bash
# 環境変数を設定
export NOTE_COOKIE="_note_session_v5=..."

# 投稿（直前のコミットとの差分が対象）
just publish
```

## トラブルシューティング

### Cookie が無効になった

note.com のセッションは一定期間で期限切れになる。ブラウザで再ログインし、Cookieを再取得する。

### CAPTCHAで弾かれる

Email/Password方式では note.com のボット検出に引っかかる場合がある。Cookie方式に切り替える。

### 記事が投稿されない

- `git diff --name-only HEAD~1 HEAD` で `articles/` 配下のファイルが差分に含まれているか確認
- 環境変数（`NOTE_COOKIE` or `NOTE_EMAIL`/`NOTE_PASSWORD`）が正しく設定されているか確認
