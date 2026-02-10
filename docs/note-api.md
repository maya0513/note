# note.com 非公式API リファレンス

> note.com は公式APIを提供していない。以下は全て非公式であり、予告なく変更・廃止される可能性がある。

**ベースURL**: `https://note.com/api`

## 1. 認証（ログイン）

### POST `/v1/sessions/sign_in`

セッションCookieを取得する。

```
Content-Type: application/json
```

**リクエスト:**

```json
{
  "login": "メールアドレス",
  "password": "パスワード"
}
```

**レスポンス:** Set-Cookie ヘッダーでセッションCookieが返される。

| Cookie名 | 用途 |
|-----------|------|
| `_note_session_v5` | メインセッション |
| `XSRF-TOKEN` | CSRFトークン（`X-XSRF-TOKEN` ヘッダーに設定が必要な場合あり） |

> **注意**: CAPTCHAやボット検出で弾かれる場合がある。Selenium経由でのCookie取得が安定する。

### 後続リクエストの認証ヘッダー

```
Cookie: _note_session_v5=xxxx; XSRF-TOKEN=xxxx
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...
```

## 2. 記事作成

### POST `/v1/text_notes`

新規記事を下書きとして作成する。

**リクエスト:**

```json
{
  "name": "記事タイトル",
  "body": "<p>本文（HTML形式）</p>",
  "template_key": null
}
```

**レスポンス (200):**

```json
{
  "data": {
    "id": 12345678,
    "key": "nxxxxxxxxxx",
    "name": "記事タイトル",
    "status": "draft"
  }
}
```

- `data.key` が記事URL `https://note.com/{username}/n/{key}` に使われる

## 3. 記事更新・下書き保存

### PUT `/v1/text_notes/{記事ID}`

記事の内容を更新する。

**リクエスト:**

```json
{
  "name": "記事タイトル",
  "body": "<p>本文（HTML形式）</p>",
  "status": "draft",
  "eyecatch_image_key": "画像キー（任意）"
}
```

### POST `/v1/text_notes/draft_save?id={記事ID}`

下書きを保存する。

**リクエスト:**

```json
{
  "body": "<p>本文（HTML形式）</p>",
  "index": 0
}
```

**レスポンス (201):**

```json
{
  "result": "OK",
  "note_days_count": 5,
  "updated_at": "2025-01-15T10:30:00+09:00"
}
```

## 4. 記事公開

### PUT `/v2/notes/{note_key}/publish`

下書き記事を公開する。`note_key` は記事作成時の `data.key`。

## 5. 画像アップロード

### POST `/v1/upload_image`

```
Content-Type: multipart/form-data
```

ファイルフィールド名: `file`

**レスポンス (200):**

```json
{
  "data": {
    "key": "画像キー",
    "url": "https://assets.st-note.com/production/uploads/images/xxxxx/xxxxx.png"
  }
}
```

- `data.key` を記事の `eyecatch_image_key` に使用
- `data.url` を本文中の `<img>` タグで使用

## 6. 投稿ワークフロー（まとめ）

```
1. POST /v1/sessions/sign_in  → セッションCookie取得
2. POST /v1/upload_image       → 画像アップロード（必要時）
3. POST /v1/text_notes         → 記事作成（下書き）
4. PUT  /v1/text_notes/{id}    → 記事更新（タイトル・本文・画像設定）
5. PUT  /v2/notes/{key}/publish → 公開
```

## 7. その他の有用なAPI

### 読み取り系（認証不要のものが多い）

| 機能 | メソッド | エンドポイント |
|------|---------|--------------|
| ユーザー詳細 | GET | `/v2/creators/{username}` |
| ユーザーの記事一覧 | GET | `/v2/creators/{username}/contents?kind=note&page=1` |
| 記事詳細 | GET | `/v3/notes/{記事ID}` |
| 記事検索 | GET | `/v3/searches?context=note&q={keyword}&size=10&start=0` |
| 下書き一覧 | GET | `/v2/note_list/contents?limit=4&page=1&status=draft` |
| カテゴリー一覧 | GET | `/v2/categories` |
| ハッシュタグ一覧 | GET | `/v2/hashtags` |

### 書き込み系（認証必須）

| 機能 | メソッド | エンドポイント |
|------|---------|--------------|
| スキ追加 | POST | `/v3/notes/{記事ID}/likes` |
| スキ削除 | DELETE | `/v3/notes/{記事ID}/likes` |
| コメント投稿 | POST | `/v1/note/{記事ID}/comments` |
| フォロー | POST | `/v3/users/{userID}/following` |
| マガジンに記事登録 | POST | `/v1/our/magazines/{magazineID}/notes` |

## 8. サンプルコード（TypeScript）

```typescript
// note.com API クライアントの基本構造

const BASE_URL = "https://note.com/api";

type Session = {
  cookies: string;
};

/** ログインしてセッションCookieを取得 */
async function login(email: string, password: string): Promise<Session> {
  const res = await fetch(`${BASE_URL}/v1/sessions/sign_in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: email, password }),
    redirect: "manual",
  });

  const setCookie = res.headers.getSetCookie();
  const cookies = setCookie.map((c) => c.split(";")[0]).join("; ");
  return { cookies };
}

/** 記事を作成（下書き） */
async function createNote(
  session: Session,
  title: string,
  bodyHtml: string,
): Promise<{ id: number; key: string }> {
  const res = await fetch(`${BASE_URL}/v1/text_notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: session.cookies,
    },
    body: JSON.stringify({
      name: title,
      body: bodyHtml,
      template_key: null,
    }),
  });

  const json = await res.json();
  return { id: json.data.id, key: json.data.key };
}

/** 記事を公開 */
async function publishNote(
  session: Session,
  noteKey: string,
): Promise<void> {
  await fetch(`${BASE_URL}/v2/notes/${noteKey}/publish`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: session.cookies,
    },
  });
}
```

## 9. 注意事項

- 非公式APIのため、予告なく仕様変更される
- 自動投稿はnoteの利用規約に抵触する可能性がある
- リクエスト間隔は5秒以上空けることを推奨
- セッションCookie名のバージョン（`_note_session_v5`）は変更される可能性がある
- APIバージョン（v1/v2/v3）がエンドポイントごとに異なる

## 参考情報源

- [2024年版 note API 非公式一覧表](https://note.com/ego_station/n/n85fcb635c0a9)
- [note非公式API完全ガイド](https://note.com/masuyohasiri/n/n1e8161d81866)
- [note非公式APIで記事を自動投稿する方法](https://note.com/taku_sid/n/n1b1b7894e28f)
- [GitHub: Mr-SuperInsane/NoteClient](https://github.com/Mr-SuperInsane/NoteClient)
