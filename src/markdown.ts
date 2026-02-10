import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import type { Root, Element, Text, RootContent } from "hast";
import type { Article } from "./types.js";

export const parseArticle = (raw: string): Article => {
  const { data, content } = matter(raw);
  if (!data.title || typeof data.title !== "string") {
    throw new Error("frontmatter に title が必要です");
  }
  return { title: data.title, body: content };
};

/** note.com 向けに見出しレベルを正規化する: h1→h2, h4-h6→h3 */
const normalizeHeadings = () => (tree: Root) => {
  const visit = (node: Root | Element): void => {
    if ("children" in node) {
      for (const child of node.children) {
        if (child.type === "element") {
          const match = /^h([1-6])$/.exec(child.tagName);
          if (match) {
            const level = Number(match[1]);
            if (level === 1) child.tagName = "h2";
            else if (level >= 4) child.tagName = "h3";
          }
          visit(child);
        }
      }
    }
  };
  visit(tree);
};

/** <strong> → <b>, <del> → <s>, inline <code> → テキストに変換 */
const normalizeInlineElements = () => (tree: Root) => {
  const visit = (node: Root | Element): void => {
    if ("children" in node) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type === "element") {
          if (child.tagName === "strong") child.tagName = "b";
          else if (child.tagName === "del") child.tagName = "s";
          else if (child.tagName === "code") {
            const text = extractText(child);
            (node.children as (Element | Text)[])[i] = {
              type: "text",
              value: text,
            };
            continue;
          }
          visit(child);
        }
      }
    }
  };
  visit(tree);
};

/** コードブロック <pre><code>...</code></pre> → <pre>...</pre>、末尾改行を除去 */
const normalizeCodeBlocks = () => (tree: Root) => {
  const visit = (node: Root | Element): void => {
    if ("children" in node) {
      for (const child of node.children) {
        if (child.type === "element") {
          if (
            child.tagName === "pre" &&
            child.children.length === 1 &&
            child.children[0].type === "element" &&
            child.children[0].tagName === "code"
          ) {
            const code = child.children[0];
            child.children = code.children;
            // 末尾改行を除去
            for (const c of child.children) {
              if (c.type === "text") {
                c.value = c.value.replace(/\n+$/, "");
              }
            }
          }
          visit(child);
        }
      }
    }
  };
  visit(tree);
};

/** ブロック要素間の空白テキストノードを除去する */
const stripInterBlockWhitespace = () => (tree: Root) => {
  const isBlockElement = (node: RootContent): boolean =>
    node.type === "element" &&
    /^(h[1-6]|p|ul|ol|li|blockquote|pre|hr|div|table)$/.test(node.tagName);

  const visit = (node: Root | Element): void => {
    if ("children" in node) {
      node.children = (node.children as RootContent[]).filter((child, i, arr) => {
        if (child.type === "text" && child.value.trim() === "") {
          const prev = arr[i - 1];
          const next = arr[i + 1];
          if (
            (prev === undefined || isBlockElement(prev)) &&
            (next === undefined || isBlockElement(next))
          ) {
            return false;
          }
        }
        return true;
      }) as typeof node.children;

      for (const child of node.children) {
        if (child.type === "element") {
          visit(child);
        }
      }
    }
  };
  visit(tree);
};

const extractText = (node: Element | Text): string => {
  if (node.type === "text") return node.value;
  if ("children" in node) {
    return node.children
      .map((c) => (c.type === "text" || c.type === "element" ? extractText(c as Element | Text) : ""))
      .join("");
  }
  return "";
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(normalizeHeadings)
  .use(normalizeInlineElements)
  .use(normalizeCodeBlocks)
  .use(stripInterBlockWhitespace)
  .use(rehypeStringify, { closeSelfClosing: false });

export const markdownToHtml = async (md: string): Promise<string> => {
  const result = await processor.process(md);
  return String(result).replace(/\n<\/pre>/g, "</pre>");
};
