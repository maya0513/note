import { test, expect } from "vitest";
import { TextlintKernel } from "@textlint/kernel";
import TextlintPluginMarkdown from "@textlint/textlint-plugin-markdown";
import rule from "../../src/textlint-rules/note-no-html.js";

const kernel = new TextlintKernel();
const lintText = (text: string) =>
  kernel.lintText(text, {
    ext: ".md",
    plugins: [{ pluginId: "markdown", plugin: TextlintPluginMarkdown }],
    rules: [{ ruleId: "note-no-html", rule }],
  });

test("通常のテキストは許可", async () => {
  const result = await lintText("これは通常のテキストです。");
  expect(result.messages).toHaveLength(0);
});

test("インライン HTML はエラー", async () => {
  const result = await lintText("<div>テスト</div>");
  expect(result.messages).toHaveLength(1);
  expect(result.messages[0].message).toContain("HTML");
});

test("br タグはエラー", async () => {
  const result = await lintText("行1<br>行2");
  expect(result.messages).toHaveLength(1);
});
