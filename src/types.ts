import type { Page, Browser } from "playwright";

export type Article = {
  readonly title: string;
  readonly body: string;
};

export type NoteSession = {
  readonly browser: Browser;
  readonly page: Page;
};

export type PublishResult = {
  readonly url: string;
};

export type AuthConfig =
  | { readonly type: "credentials"; readonly email: string; readonly password: string }
  | { readonly type: "cookie"; readonly cookie: string };
