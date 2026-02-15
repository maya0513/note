import { test, expect } from "vitest";
import { TextlintKernel } from "@textlint/kernel";
import TextlintPluginMarkdown from "@textlint/textlint-plugin-markdown";
import rule from "../../src/textlint-rules/note-no-strikethrough.js";

const kernel = new TextlintKernel();
const lintText = (text: string) =>
  kernel.lintText(text, {
    ext: ".md",
    plugins: [{ pluginId: "markdown", plugin: TextlintPluginMarkdown }],
    rules: [{ ruleId: "note-no-strikethrough", rule }],
  });

test("通常のテキストは許可", async () => {
  const result = await lintText("これは通常のテキストです。");
  expect(result.messages).toHaveLength(0);
});

test("取り消し線はエラー", async () => {
  const result = await lintText("~~取り消し~~");
  expect(result.messages).toHaveLength(1);
  expect(result.messages[0].message).toContain("取り消し線");
});
