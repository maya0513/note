import { describe, it, expect, vi } from "vitest";
import { getChangedArticles, publishAll } from "../src/publish.js";
import type { NoteSession } from "../src/types.js";

describe("getChangedArticles", () => {
  it("git diff の出力から articles/ 配下の .md ファイルを抽出する", async () => {
    const execMock = vi.fn().mockResolvedValue(
      "articles/first.md\narticles/second.md\nsrc/other.ts\n",
    );

    const files = await getChangedArticles(execMock);
    expect(files).toEqual(["articles/first.md", "articles/second.md"]);
  });

  it("変更ファイルがない場合は空配列を返す", async () => {
    const execMock = vi.fn().mockResolvedValue("");

    const files = await getChangedArticles(execMock);
    expect(files).toEqual([]);
  });

  it("articles/ 配下以外のファイルは除外する", async () => {
    const execMock = vi.fn().mockResolvedValue("src/index.ts\nREADME.md\n");

    const files = await getChangedArticles(execMock);
    expect(files).toEqual([]);
  });

  it("git diff が失敗した場合 git ls-files にフォールバックする", async () => {
    const execMock = vi.fn()
      .mockRejectedValueOnce(new Error("fatal: ambiguous argument 'HEAD~1'"))
      .mockResolvedValueOnce("articles/first.md\narticles/second.md\n");

    const files = await getChangedArticles(execMock);
    expect(execMock).toHaveBeenCalledTimes(2);
    expect(files).toEqual(["articles/first.md", "articles/second.md"]);
  });

  it(".md 以外の拡張子は除外する", async () => {
    const execMock = vi.fn().mockResolvedValue("articles/image.png\narticles/post.md\n");

    const files = await getChangedArticles(execMock);
    expect(files).toEqual(["articles/post.md"]);
  });
});

describe("publishAll", () => {
  it("各記事をパース・変換・投稿する", async () => {
    const mockReadFile = vi.fn().mockResolvedValue(`---
title: "テスト"
---

## 見出し

本文`);

    const mockPostArticle = vi.fn().mockResolvedValue({
      url: "https://note.com/user/n/ntest123",
    });

    const mockSession = {} as NoteSession;

    const results = await publishAll(
      ["articles/test.md"],
      mockSession,
      mockReadFile,
      mockPostArticle,
    );

    expect(mockReadFile).toHaveBeenCalledWith("articles/test.md", "utf-8");
    expect(mockPostArticle).toHaveBeenCalledWith(
      mockSession,
      "テスト",
      expect.stringContaining("<h2>見出し</h2>"),
    );
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://note.com/user/n/ntest123");
  });

  it("複数記事を順番に投稿する", async () => {
    const callOrder: string[] = [];

    const mockReadFile = vi.fn().mockImplementation(async (path: string) => {
      callOrder.push(`read:${path}`);
      return `---\ntitle: "${path}"\n---\n\n本文`;
    });

    const mockPostArticle = vi.fn().mockImplementation(async (_s, title) => {
      callOrder.push(`post:${title}`);
      return { url: `https://note.com/user/n/${title}` };
    });

    const mockSession = {} as NoteSession;

    await publishAll(
      ["articles/a.md", "articles/b.md"],
      mockSession,
      mockReadFile,
      mockPostArticle,
    );

    expect(callOrder).toEqual([
      "read:articles/a.md",
      "post:articles/a.md",
      "read:articles/b.md",
      "post:articles/b.md",
    ]);
  });

  it("ファイルがない場合は空配列を返す", async () => {
    const mockSession = {} as NoteSession;
    const results = await publishAll([], mockSession, vi.fn(), vi.fn());
    expect(results).toEqual([]);
  });

  it("ファイル読み込みに失敗した場合はエラーが伝播する", async () => {
    const mockReadFile = vi.fn().mockRejectedValue(new Error("ENOENT: no such file"));
    const mockSession = {} as NoteSession;

    await expect(
      publishAll(["articles/missing.md"], mockSession, mockReadFile, vi.fn()),
    ).rejects.toThrow("ENOENT");
  });

  it("投稿に失敗した場合はエラーが伝播する", async () => {
    const mockReadFile = vi.fn().mockResolvedValue(`---\ntitle: "テスト"\n---\n\n本文`);
    const mockPostArticle = vi.fn().mockRejectedValue(new Error("投稿失敗"));
    const mockSession = {} as NoteSession;

    await expect(
      publishAll(["articles/test.md"], mockSession, mockReadFile, mockPostArticle),
    ).rejects.toThrow("投稿失敗");
  });
});
