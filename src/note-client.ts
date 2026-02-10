import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Browser, type Frame, type Locator, type Page } from "playwright";
import type { NoteSession, AuthConfig, PublishResult } from "./types.js";

type LaunchFn = () => Promise<Browser>;

const defaultLaunch: LaunchFn = () => chromium.launch({ headless: true });

type EditableContext = Pick<Page, "locator" | "getByRole"> | Pick<Frame, "locator" | "getByRole">;

const waitVisible = async (locator: Locator, timeout: number): Promise<boolean> => {
  try {
    await locator.waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
};

const findInContexts = async (
  contexts: EditableContext[],
  selectors: string[],
  timeout: number,
): Promise<Locator | null> => {
  for (const context of contexts) {
    for (const selector of selectors) {
      const candidate = context.locator(selector).first();
      if (await waitVisible(candidate, timeout)) {
        return candidate;
      }
    }
  }
  return null;
};

type EditableElementInfo = {
  tag: string;
  type: string | null;
  placeholder: string | null;
  role: string | null;
  contenteditable: string | null;
  class: string;
};

const collectEditableElements = async (page: Page): Promise<EditableElementInfo[]> =>
  page.evaluate(() => {
    const visited = new Set<Element>();
    const results: EditableElementInfo[] = [];

    const collect = (root: ParentNode) => {
      const elements = root.querySelectorAll("textarea, input, [contenteditable], [role='textbox']");
      for (const el of elements) {
        if (visited.has(el)) continue;
        visited.add(el);
        results.push({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute("type"),
          placeholder: el.getAttribute("placeholder"),
          role: el.getAttribute("role"),
          contenteditable: el.getAttribute("contenteditable"),
          class: String(el.className ?? "").slice(0, 120),
        });
      }
      const all = root.querySelectorAll("*");
      for (const node of all) {
        const shadowRoot = (node as HTMLElement).shadowRoot;
        if (shadowRoot) {
          collect(shadowRoot);
        }
      }
    };

    collect(document);
    return results;
  });

const parseCookieString = (cookieStr: string) =>
  cookieStr.split(";").map((pair) => {
    const [name, ...rest] = pair.trim().split("=");
    return {
      name: name.trim(),
      value: rest.join("=").trim(),
      domain: ".note.com" as const,
      path: "/" as const,
      expires: -1,
      httpOnly: false,
      secure: true,
      sameSite: "None" as const,
    };
  });

export const login = async (
  config: AuthConfig,
  launch: LaunchFn = defaultLaunch,
): Promise<NoteSession> => {
  const browser = await launch();
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });

  if (config.type === "cookie") {
    await context.addCookies(parseCookieString(config.cookie));
  }

  const page = await context.newPage();

  if (config.type === "credentials") {
    await page.goto("https://note.com/login");
    const emailInput = page.locator('input[name="login"]');
    await emailInput.fill(config.email);
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill(config.password);
    const submitButton = page.getByRole("button", { name: "ログイン" });
    await submitButton.click();
    await page.waitForURL("https://note.com/**", { timeout: 30000 });
  } else {
    // Cookie方式: ログイン状態を検証
    await page.goto("https://note.com/dashboard");
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      throw new Error("Cookie認証に失敗しました。Cookieが無効または期限切れです。");
    }
  }

  return { browser, page };
};

export const postArticle = async (
  session: NoteSession,
  title: string,
  bodyHtml: string,
): Promise<PublishResult> => {
  const { page } = session;

  await page.goto("https://editor.note.com/new", { waitUntil: "networkidle" });
  await page.waitForLoadState("domcontentloaded");

  // デバッグ: ページ状態を記録
  console.log(`[debug] editor URL: ${page.url()}`);
  await mkdir("debug", { recursive: true });
  await page.screenshot({ path: "debug/editor-page.png", fullPage: true });
  await writeFile("debug/editor-page.html", await page.content(), "utf-8");
  const pageTitle = await page.title();
  console.log(`[debug] page title: ${pageTitle}`);

  // SPAの初期化待機（読み込み遅延で入力欄が出るケースを吸収）
  await page.waitForFunction(() => {
    const hasEditable = document.querySelector("textarea, input, [contenteditable], [role='textbox']");
    const hasKnownText = document.body?.innerText?.includes("公開に進む") || document.body?.innerText?.includes("投稿する");
    return Boolean(hasEditable || hasKnownText);
  }, { timeout: 45000 }).catch(() => undefined);

  // デバッグ: 入力可能な要素を列挙（shadow DOM も探索）
  const inputInfo = await collectEditableElements(page);
  console.log("[debug] editable elements:", JSON.stringify(inputInfo, null, 2));
  const frameInfo = page.frames().map((frame) => ({ name: frame.name(), url: frame.url() }));
  console.log("[debug] frames:", JSON.stringify(frameInfo, null, 2));

  const contexts: EditableContext[] = [page, ...page.frames()];

  // タイトル入力
  const titleInput = await findInContexts(
    contexts,
    [
      'textarea[placeholder*="タイトル"]',
      'input[placeholder*="タイトル"]',
      '[contenteditable="true"][data-placeholder*="タイトル"]',
      '[aria-label*="タイトル"]',
      'textarea[placeholder*="title" i]',
      'input[placeholder*="title" i]',
    ],
    3000,
  );
  const titleTextboxFallback = titleInput ?? await findInContexts(contexts, ['[role="textbox"]'], 3000);
  if (!titleTextboxFallback) {
    throw new Error("タイトル入力欄が見つかりませんでした。debug ログを確認してください。");
  }
  await titleTextboxFallback.click();
  await titleTextboxFallback.fill(title);
  await page.waitForTimeout(300);

  // 本文入力: contenteditable にフォーカスしてHTML をクリップボード経由でペースト
  const editor = await findInContexts(
    contexts,
    [
      'div[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"][data-placeholder*="本文"]',
      '[contenteditable="true"][aria-label*="本文"]',
      'div[contenteditable="true"]',
      '[role="textbox"][contenteditable="true"]',
    ],
    3000,
  );
  const editorFallback = editor ?? await findInContexts(contexts, ['[role="textbox"]'], 3000);
  if (!editorFallback) {
    throw new Error("本文エディタが見つかりませんでした。debug ログを確認してください。");
  }
  await editorFallback.waitFor({ timeout: 10000 });
  await editorFallback.click();
  await page.evaluate((html: string) => {
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([html], { type: "text/plain" }),
    });
    return navigator.clipboard.write([item]);
  }, bodyHtml);
  await page.keyboard.press("ControlOrMeta+v");
  await page.waitForTimeout(1000);

  // 「公開に進む」ボタンをクリック
  const publishSettingsButton = page.locator('button:has-text("公開に進む")');
  await publishSettingsButton.click();
  await page.waitForTimeout(2000);

  // 「投稿する」ボタンをクリック
  const publishButton = page.locator('button:has-text("投稿する")');
  await publishButton.click();

  // 公開完了を待機
  await page.waitForURL("**/n/**", { timeout: 30000 });

  return { url: page.url() };
};

export const close = async (session: NoteSession): Promise<void> => {
  await session.browser.close();
};
