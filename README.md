# note-publisher

**注意: 動きません！**

`articles/` に Markdown ファイルを置いて push すると、GitHub Actions 経由で note.com に記事を自動公開する。

## セットアップ

```bash
pnpm install
npx playwright install chromium
```

## 認証

Cookie 方式を推奨。ブラウザの DevTools (F12) → Application → Cookies → `https://note.com` から `_note_session_v5` の値を取得し、GitHub Secrets に登録する。

| Secret | 値 |
|--------|---|
| `NOTE_COOKIE` | `_note_session_v5=取得した値` |

詳細は [docs/usage.md](docs/usage.md) を参照。

## 記事の書き方

`articles/` に `.md` ファイルを作成する。

```markdown
---
title: "記事タイトル"
---

## 見出し

本文を Markdown で記述する。
```

対応書式の詳細は [docs/note-format.md](docs/note-format.md) を参照。

## コマンド

| コマンド | 説明 |
|----------|------|
| `just test` | テスト実行 |
| `just publish` | 手動で記事を投稿 |

## 構成

```
articles/          # 記事 (Markdown + frontmatter)
src/
  types.ts         # 型定義
  markdown.ts      # Markdown → HTML 変換 (note.com 書式に正規化)
  note-client.ts   # Playwright ベースのブラウザ自動化
  publish.ts       # オーケストレーション (エントリポイント)
tests/             # vitest テスト
docs/
  usage.md         # 使い方ガイド
  note-format.md   # note.com 対応書式リファレンス
  note-api.md      # note.com 非公式 API リファレンス
```
