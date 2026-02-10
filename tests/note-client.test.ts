import { describe, it, expect, vi, beforeEach } from "vitest";
import { login, postArticle, close } from "../src/note-client.js";
import type { Page, Browser, BrowserContext, Locator } from "playwright";

const createMockLocator = (): Locator =>
  ({
    fill: vi.fn(),
    click: vi.fn(),
    setInputFiles: vi.fn(),
    innerHTML: vi.fn(),
    waitFor: vi.fn(),
    first: vi.fn(function () { return this; }),
    last: vi.fn(function () { return this; }),
  }) as unknown as Locator;

const createMockPage = (): Page => {
  const mockPage = {
    goto: vi.fn(),
    locator: vi.fn().mockReturnValue(createMockLocator()),
    getByRole: vi.fn().mockReturnValue(createMockLocator()),
    getByText: vi.fn().mockReturnValue(createMockLocator()),
    waitForURL: vi.fn(),
    waitForSelector: vi.fn(),
    waitForLoadState: vi.fn(),
    waitForFunction: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue("https://note.com/testuser/n/ntest123"),
    evaluate: vi.fn(),
    waitForTimeout: vi.fn(),
    screenshot: vi.fn(),
    content: vi.fn().mockResolvedValue("<html></html>"),
    title: vi.fn().mockResolvedValue("note editor"),
    mouse: { click: vi.fn() },
    keyboard: { press: vi.fn() },
    frames: vi.fn().mockReturnValue([]),
    close: vi.fn(),
  } as unknown as Page;
  return mockPage;
};

const createMockBrowser = (page: Page): Browser => {
  const mockContext = {
    newPage: vi.fn().mockResolvedValue(page),
    addCookies: vi.fn(),
  } as unknown as BrowserContext;

  return {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn(),
  } as unknown as Browser;
};

describe("login", () => {
  it("credentials 方式でログインページに遷移し、フォームを送信する", async () => {
    const page = createMockPage();
    const browser = createMockBrowser(page);
    const launchMock = vi.fn().mockResolvedValue(browser);

    const session = await login(
      { type: "credentials", email: "test@example.com", password: "pass123" },
      launchMock,
    );

    expect(launchMock).toHaveBeenCalled();
    expect(page.goto).toHaveBeenCalledWith("https://note.com/login");
    expect(session.browser).toBe(browser);
    expect(session.page).toBe(page);
  });

  it("cookie 方式でコンテキストにCookieを追加する", async () => {
    const page = createMockPage();
    const browser = createMockBrowser(page);
    const launchMock = vi.fn().mockResolvedValue(browser);

    const session = await login(
      { type: "cookie", cookie: "_note_session_v5=abc123" },
      launchMock,
    );

    expect(launchMock).toHaveBeenCalled();
    const context = await browser.newContext();
    expect(context.addCookies).toHaveBeenCalled();
    expect(session.page).toBe(page);
  });
});

describe("postArticle", () => {
  it("新規記事ページに遷移し、タイトルと本文を入力して公開する", async () => {
    const page = createMockPage();
    const browser = createMockBrowser(page);
    const session = { browser, page };

    const result = await postArticle(session, "テスト記事", "<p>本文</p>");

    expect(page.goto).toHaveBeenCalledWith("https://editor.note.com/new", { waitUntil: "networkidle" });
    expect(result.url).toBe("https://note.com/testuser/n/ntest123");
  });
});

describe("close", () => {
  it("ブラウザを閉じる", async () => {
    const page = createMockPage();
    const browser = createMockBrowser(page);
    const session = { browser, page };

    await close(session);

    expect(browser.close).toHaveBeenCalled();
  });
});
