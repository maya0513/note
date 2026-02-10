import { mkdir } from "node:fs/promises";
import { chromium, type Browser } from "playwright";
import type { NoteSession, AuthConfig, PublishResult } from "./types.js";

type LaunchFn = () => Promise<Browser>;

const defaultLaunch: LaunchFn = () => chromium.launch({ headless: true });

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
  const context = await browser.newContext();

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

  await page.goto("https://note.com/editor/new", { waitUntil: "networkidle" });

  // デバッグ: ページ状態を記録
  console.log(`[debug] editor URL: ${page.url()}`);
  await mkdir("debug", { recursive: true });
  await page.screenshot({ path: "debug/editor-page.png", fullPage: true });
  const pageTitle = await page.title();
  console.log(`[debug] page title: ${pageTitle}`);

  // タイトル入力（textarea）
  const titleInput = page.locator('textarea[placeholder*="タイトル"]');
  await titleInput.waitFor({ timeout: 30000 });
  await titleInput.fill(title);

  // 本文をエディタに挿入（contenteditable div に HTML を直接設定）
  const editor = page.locator('div[contenteditable="true"][role="textbox"]');
  await editor.waitFor({ timeout: 10000 });
  await page.evaluate((html: string) => {
    const el = document.querySelector<HTMLElement>('div[contenteditable="true"][role="textbox"]');
    if (el) el.innerHTML = html;
  }, bodyHtml);

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
