# textlint

日本語マークダウン記事の文章校正ツール。

## コマンド

```bash
# 校正チェック
just lint

# 自動修正
just lint-fix
```

## 対象ファイル

`articles/**/*.md`

## ルールプリセット

| プリセット | 用途 |
|---|---|
| [preset-ja-technical-writing](https://github.com/textlint-ja/textlint-rule-preset-ja-technical-writing) | 技術文書向けルール（冗長表現、二重否定、同一接続詞の連続使用など） |
| [preset-ja-spacing](https://github.com/textlint-ja/textlint-rule-preset-ja-spacing) | スペースルール（全角・半角間のスペース統一など） |

## 設定

`.textlintrc.json` でルールのカスタマイズが可能。

```json
{
  "rules": {
    "preset-ja-technical-writing": {
      "sentence-length": { "max": 150 }
    }
  }
}
```

個別ルールの詳細は各プリセットのリポジトリを参照。
