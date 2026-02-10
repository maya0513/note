import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseArticle, markdownToHtml } from "./markdown.js";
import { login, postArticle, close } from "./note-client.js";
import type { NoteSession, AuthConfig, PublishResult } from "./types.js";

const execFileAsync = promisify(execFile);

type ExecFn = (cmd: string) => Promise<string>;
type ReadFileFn = (path: string, encoding: string) => Promise<string>;
type PostArticleFn = (session: NoteSession, title: string, bodyHtml: string) => Promise<PublishResult>;

const defaultExec: ExecFn = async (cmd: string) => {
  const [command, ...args] = cmd.split(" ");
  const { stdout } = await execFileAsync(command, args);
  return stdout;
};

export const getChangedArticles = async (
  exec: ExecFn = defaultExec,
): Promise<string[]> => {
  const output = await exec("git diff --name-only HEAD~1 HEAD");
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("articles/") && line.endsWith(".md"));
};

export const publishAll = async (
  files: string[],
  session: NoteSession,
  readFileFn: ReadFileFn = (path, enc) => readFile(path, enc as BufferEncoding),
  postArticleFn: PostArticleFn = postArticle,
): Promise<PublishResult[]> => {
  const results: PublishResult[] = [];

  for (const file of files) {
    const raw = await readFileFn(file, "utf-8");
    const article = parseArticle(raw);
    const html = await markdownToHtml(article.body);
    const result = await postArticleFn(session, article.title, html);
    console.log(`Published: ${article.title} → ${result.url}`);
    results.push(result);
  }

  return results;
};

// CLI エントリポイント
const main = async () => {
  const authConfig: AuthConfig = process.env.NOTE_COOKIE
    ? { type: "cookie", cookie: process.env.NOTE_COOKIE }
    : {
        type: "credentials",
        email: process.env.NOTE_EMAIL ?? "",
        password: process.env.NOTE_PASSWORD ?? "",
      };

  const files = await getChangedArticles();
  if (files.length === 0) {
    console.log("No changed articles found.");
    return;
  }

  console.log(`Found ${files.length} article(s) to publish: ${files.join(", ")}`);

  const session = await login(authConfig);
  try {
    const results = await publishAll(files, session);
    console.log(`Successfully published ${results.length} article(s).`);
  } finally {
    await close(session);
  }
};

// ESM の直接実行判定
const isMainModule = process.argv[1]?.endsWith("publish.ts") || process.argv[1]?.endsWith("publish.js");
if (isMainModule) {
  main().catch((err) => {
    console.error("Publish failed:", err);
    process.exit(1);
  });
}
