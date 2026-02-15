import { test, expect } from "vitest";
import { TextlintKernel } from "@textlint/kernel";
import TextlintPluginMarkdown from "@textlint/textlint-plugin-markdown";
import rule from "../../src/textlint-rules/note-no-table.js";

const kernel = new TextlintKernel();
const lintText = (text: string) =>
  kernel.lintText(text, {
    ext: ".md",
    plugins: [{ pluginId: "markdown", plugin: TextlintPluginMarkdown }],
    rules: [{ ruleId: "note-no-table", rule }],
  });

test("通常のテキストは許可", async () => {
  const result = await lintText("これは通常のテキストです。");
  expect(result.messages).toHaveLength(0);
});

test("テーブルはエラー", async () => {
  const text = `| a | b |
| --- | --- |
| 1 | 2 |`;
  const result = await lintText(text);
  expect(result.messages).toHaveLength(1);
  expect(result.messages[0].message).toContain("テーブル");
});
