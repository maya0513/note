import { test, expect } from "vitest";
import { TextlintKernel } from "@textlint/kernel";
import TextlintPluginMarkdown from "@textlint/textlint-plugin-markdown";
import rule from "../../src/textlint-rules/note-heading-level.js";

const kernel = new TextlintKernel();
const lintText = (text: string) =>
  kernel.lintText(text, {
    ext: ".md",
    plugins: [{ pluginId: "markdown", plugin: TextlintPluginMarkdown }],
    rules: [{ ruleId: "note-heading-level", rule }],
  });

test("h2 は許可", async () => {
  const result = await lintText("## 見出し2");
  expect(result.messages).toHaveLength(0);
});

test("h3 は許可", async () => {
  const result = await lintText("### 見出し3");
  expect(result.messages).toHaveLength(0);
});

test("h1 はエラー", async () => {
  const result = await lintText("# 見出し1");
  expect(result.messages).toHaveLength(1);
  expect(result.messages[0].message).toContain("h1");
});

test("h4 はエラー", async () => {
  const result = await lintText("#### 見出し4");
  expect(result.messages).toHaveLength(1);
  expect(result.messages[0].message).toContain("h4");
});

test("h5 はエラー", async () => {
  const result = await lintText("##### 見出し5");
  expect(result.messages).toHaveLength(1);
  expect(result.messages[0].message).toContain("h5");
});

test("h6 はエラー", async () => {
  const result = await lintText("###### 見出し6");
  expect(result.messages).toHaveLength(1);
  expect(result.messages[0].message).toContain("h6");
});

test("複数の非対応見出しで複数エラー", async () => {
  const result = await lintText("# h1\n\n#### h4");
  expect(result.messages).toHaveLength(2);
});
