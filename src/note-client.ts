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
  }

  return { browser, page };
};

export const postArticle = async (
  session: NoteSession,
  title: string,
  bodyHtml: string,
): Promise<PublishResult> => {
  const { page } = session;

  await page.goto("https://note.com/editor/new");
  await page.waitForTimeout(2000);

  // タイトル入力
  const titleInput = page.locator('[placeholder="記事タイトル"]');
  await titleInput.fill(title);

  // 本文をエディタに挿入（contenteditable 領域に HTML を直接設定）
  await page.evaluate((html: string) => {
    const editor = document.querySelector<HTMLElement>('[contenteditable="true"]');
    if (editor) editor.innerHTML = html;
  }, bodyHtml);

  await page.waitForTimeout(1000);

  // 公開設定ボタンをクリック
  const publishSettingsButton = page.getByText("公開設定");
  await publishSettingsButton.click();
  await page.waitForTimeout(1000);

  // 投稿ボタンをクリック
  const publishButton = page.getByRole("button", { name: "投稿" });
  await publishButton.click();

  // 公開完了を待機
  await page.waitForURL("**/n/**", { timeout: 30000 });

  return { url: page.url() };
};

export const close = async (session: NoteSession): Promise<void> => {
  await session.browser.close();
};
