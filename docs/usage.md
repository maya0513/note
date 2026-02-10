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

1. ブラウザで note.com にログイン
2. DevTools → Application → Cookies → `_note_session_v5` の値をコピー
3. 環境変数に設定:

```bash
export NOTE_COOKIE="_note_session_v5=コピーした値"
```

#### Email/Password方式

```bash
export NOTE_EMAIL="your-email@example.com"
export NOTE_PASSWORD="your-password"
```

> `NOTE_COOKIE` が設定されている場合はCookie方式が優先される。

### 3. GitHub Actions で使う場合

リポジトリの Settings → Secrets and variables → Actions に以下を登録:

| Secret名 | 説明 |
|-----------|------|
| `NOTE_COOKIE` | Cookie文字列（推奨） |
| `NOTE_EMAIL` | メールアドレス（Cookie未設定時のフォールバック） |
| `NOTE_PASSWORD` | パスワード（同上） |

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
