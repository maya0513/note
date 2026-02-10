import { describe, it, expect } from "vitest";
import { parseArticle, markdownToHtml } from "../src/markdown.js";

describe("parseArticle", () => {
  it("frontmatter から title と body を抽出する", () => {
    const raw = `---
title: "テスト記事"
---

本文です。`;

    const article = parseArticle(raw);
    expect(article.title).toBe("テスト記事");
    expect(article.body.trim()).toBe("本文です。");
  });

  it("frontmatter がない場合はエラーを投げる", () => {
    expect(() => parseArticle("本文だけ")).toThrow();
  });

  it("title がない場合はエラーを投げる", () => {
    const raw = `---
draft: true
---

本文`;

    expect(() => parseArticle(raw)).toThrow();
  });
});

describe("markdownToHtml", () => {
  it("段落を <p> に変換する", async () => {
    const html = await markdownToHtml("これは段落です。");
    expect(html).toBe("<p>これは段落です。</p>");
  });

  it("h2 見出しをそのまま <h2> に変換する", async () => {
    const html = await markdownToHtml("## 大見出し");
    expect(html).toBe("<h2>大見出し</h2>");
  });

  it("h3 見出しをそのまま <h3> に変換する", async () => {
    const html = await markdownToHtml("### 小見出し");
    expect(html).toBe("<h3>小見出し</h3>");
  });

  it("h1 を h2 に正規化する", async () => {
    const html = await markdownToHtml("# 最上位見出し");
    expect(html).toBe("<h2>最上位見出し</h2>");
  });

  it("h4〜h6 を h3 に正規化する", async () => {
    const h4 = await markdownToHtml("#### レベル4");
    expect(h4).toBe("<h3>レベル4</h3>");

    const h5 = await markdownToHtml("##### レベル5");
    expect(h5).toBe("<h3>レベル5</h3>");

    const h6 = await markdownToHtml("###### レベル6");
    expect(h6).toBe("<h3>レベル6</h3>");
  });

  it("太字を <b> に変換する", async () => {
    const html = await markdownToHtml("**太字テキスト**");
    expect(html).toBe("<p><b>太字テキスト</b></p>");
  });

  it("斜体を <em> に変換する", async () => {
    const html = await markdownToHtml("*斜体テキスト*");
    expect(html).toBe("<p><em>斜体テキスト</em></p>");
  });

  it("取り消し線を <s> に変換する", async () => {
    const html = await markdownToHtml("~~取り消し~~");
    expect(html).toBe("<p><s>取り消し</s></p>");
  });

  it("引用を <blockquote><p> に変換する", async () => {
    const html = await markdownToHtml("> 引用文");
    expect(html).toBe("<blockquote><p>引用文</p></blockquote>");
  });

  it("箇条書きリストを <ul><li> に変換する", async () => {
    const html = await markdownToHtml("- 項目1\n- 項目2");
    expect(html).toBe("<ul><li>項目1</li><li>項目2</li></ul>");
  });

  it("番号付きリストを <ol><li> に変換する", async () => {
    const html = await markdownToHtml("1. 一番目\n2. 二番目");
    expect(html).toBe("<ol><li>一番目</li><li>二番目</li></ol>");
  });

  it("コードブロックを <pre> に変換する（言語指定は除去）", async () => {
    const html = await markdownToHtml("```js\nconsole.log('hello');\n```");
    expect(html).toBe("<pre>console.log('hello');</pre>");
  });

  it("区切り線を <hr> に変換する", async () => {
    const html = await markdownToHtml("---");
    expect(html).toBe("<hr>");
  });

  it("リンクを <a> に変換する", async () => {
    const html = await markdownToHtml("[リンク](https://example.com)");
    expect(html).toBe('<p><a href="https://example.com">リンク</a></p>');
  });

  it("インラインコードはタグ変換せずテキストとして残す", async () => {
    const html = await markdownToHtml("テキスト `code` テキスト");
    expect(html).toBe("<p>テキスト code テキスト</p>");
  });

  describe("note.com 非対応要素の処理", () => {
    it("テーブルはそのままHTMLタグとして出力される", async () => {
      const md = "| A | B |\n|---|---|\n| 1 | 2 |";
      const html = await markdownToHtml(md);
      // テーブルはnote.com非対応だが、変換自体はHTMLとして出力される
      expect(html).toContain("<table>");
      expect(html).toContain("<td>1</td>");
    });

    it("ネストリストを変換する", async () => {
      const md = "- 親\n  - 子";
      const html = await markdownToHtml(md);
      expect(html).toContain("<ul>");
      expect(html).toContain("<li>");
    });

    it("画像を <img> に変換する", async () => {
      const html = await markdownToHtml("![代替テキスト](https://example.com/img.png)");
      expect(html).toContain("<img");
      expect(html).toContain('src="https://example.com/img.png"');
      expect(html).toContain('alt="代替テキスト"');
    });

    it("タスクリストを変換する", async () => {
      const html = await markdownToHtml("- [ ] 未完了\n- [x] 完了");
      expect(html).toContain("<ul");
      expect(html).toContain("<li");
      expect(html).toContain("未完了");
      expect(html).toContain("完了");
    });
  });

  describe("エッジケース", () => {
    it("空文字列を渡すと空文字列を返す", async () => {
      const html = await markdownToHtml("");
      expect(html).toBe("");
    });

    it("HTML特殊文字をエスケープする", async () => {
      const html = await markdownToHtml("A < B & C > D");
      expect(html).toBe("<p>A &#x3C; B &#x26; C > D</p>");
    });

    it("複数のコードブロックを正しく変換する", async () => {
      const md = "```\nfirst\n```\n\n```\nsecond\n```";
      const html = await markdownToHtml(md);
      expect(html).toBe("<pre>first</pre><pre>second</pre>");
    });

    it("太字と斜体の組み合わせを変換する", async () => {
      const html = await markdownToHtml("***太字斜体***");
      expect(html).toContain("<b>");
      expect(html).toContain("<em>");
    });
  });

  it("複合的なMarkdownを正しく変換する", async () => {
    const md = `## 見出し

本文テキスト。**太字**を含む。

- 項目A
- 項目B

> 引用`;

    const html = await markdownToHtml(md);
    expect(html).toBe(
      "<h2>見出し</h2>" +
        "<p>本文テキスト。<b>太字</b>を含む。</p>" +
        "<ul><li>項目A</li><li>項目B</li></ul>" +
        "<blockquote><p>引用</p></blockquote>",
    );
  });
});
