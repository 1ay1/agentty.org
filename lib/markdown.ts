// Markdown → HTML for every content page (docs, blog, guides, compare, pages,
// changelog). Build time only: markdown-it is a full CommonMark parser, so
// nested lists, code blocks inside list items, multi-paragraph items, tables,
// and blockquotes all render correctly. Raw HTML in content is NOT passed
// through (html: false) — output is safe by construction.
//
// Site extensions on top of CommonMark:
//   [[Ctrl+K]]                  → <kbd>Ctrl+K</kbd>
//   :::tip|note|warn [label]    → callout (body is full markdown); aliases:
//   … :::                         warning, caution, danger, important, info, hint
//   :::release-table            → directive sentinel, rendered by DocBody
//   ```lang                     → build-time syntax highlighting (lib/highlight)
//   headings                    → stable unique ids + a self-link anchor
//   external links              → open in a new tab, marked ↗
import MarkdownIt from "markdown-it";
import container from "markdown-it-container";
import { highlight } from "./highlight";

export type MdHeading = { id: string; text: string; level: number };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const slugify = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-") || "section";

const CALLOUTS: Record<string, [string, string]> = {
  note: ["note", "Note"], info: ["note", "Note"], important: ["note", "Important"],
  tip: ["tip", "Tip"], hint: ["tip", "Tip"],
  warn: ["warn", "Warning"], warning: ["warn", "Warning"], caution: ["warn", "Caution"], danger: ["warn", "Danger"],
};

type Env = { ids: Map<string, number>; headings: MdHeading[] };

function build(): MarkdownIt {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

  // [[keys]] → <kbd>
  md.inline.ruler.before("link", "kbd", (state, silent) => {
    const src = state.src, pos = state.pos;
    if (src.charCodeAt(pos) !== 0x5b || src.charCodeAt(pos + 1) !== 0x5b) return false;
    const end = src.indexOf("]]", pos + 2);
    if (end < 0 || end === pos + 2 || src.slice(pos + 2, end).includes("\n")) return false;
    if (!silent) {
      const t = state.push("kbd", "", 0);
      t.content = src.slice(pos + 2, end);
    }
    state.pos = end + 2;
    return true;
  });
  md.renderer.rules.kbd = (tokens, i) => `<kbd>${esc(tokens[i].content)}</kbd>`;

  // callouts
  md.use(container, "callout", {
    validate: (params: string) => {
      const m = params.trim().match(/^([a-z]+)\b/);
      return !!m && m[1] in CALLOUTS;
    },
    render: (tokens: { nesting: number; info: string }[], i: number) => {
      if (tokens[i].nesting !== 1) return "</aside>\n";
      const m = tokens[i].info.trim().match(/^([a-z]+)\s*(.*)$/)!;
      const [type, dflt] = CALLOUTS[m[1]];
      const cls = type === "note" ? "note" : `note ${type}`;
      return `<aside class="${cls}" role="note"><span class="label">${md.renderInline(m[2].trim() || dflt)}</span>\n`;
    },
  });

  // fenced code → highlighted block with header (language, copy)
  md.renderer.rules.fence = (tokens, i) => {
    const t = tokens[i];
    const { html, label } = highlight(t.content.replace(/\n$/, ""), t.info.split(/\s+/)[0] || "");
    return (
      `<div class="codeblock"><div class="codeblock-head"><span>${esc(label)}</span>` +
      `<button type="button" class="codeblock-copy" aria-label="Copy code">copy</button></div>` +
      `<pre class="code"><code>${html}</code></pre></div>\n`
    );
  };
  md.renderer.rules.code_block = (tokens, i) =>
    `<div class="codeblock"><div class="codeblock-head"><span></span><button type="button" class="codeblock-copy" aria-label="Copy code">copy</button></div>` +
    `<pre class="code"><code>${esc(tokens[i].content.replace(/\n$/, ""))}</code></pre></div>\n`;

  // headings: unique ids, self-link anchor, collected for TOC / search
  md.renderer.rules.heading_open = (tokens, i, _o, env: Env) => {
    const level = Number(tokens[i].tag.slice(1));
    const inline = tokens[i + 1];
    const plain = (inline.children ?? [])
      .filter((c) => c.type === "text" || c.type === "code_inline" || c.type === "kbd")
      .map((c) => c.content)
      .join("");
    const base = slugify(plain);
    const n = env.ids.get(base) ?? 0;
    env.ids.set(base, n + 1);
    const id = n ? `${base}-${n}` : base;
    env.headings.push({ id, text: plain.trim(), level });
    (tokens[i] as unknown as { _id: string })._id = id;
    return `<h${level} id="${id}">`;
  };
  md.renderer.rules.heading_close = (tokens, i) => {
    const level = Number(tokens[i].tag.slice(1));
    const open = tokens[i - 2] as unknown as { _id: string };
    return level >= 2
      ? `<a class="anchor" href="#${open._id}" aria-label="Link to this section"></a></h${level}>\n`
      : `</h${level}>\n`;
  };

  // external links: new tab, ↗ marker (unless the text already has one or is code)
  md.renderer.rules.link_open = (tokens, i, o, _env, self) => {
    const t = tokens[i];
    const href = t.attrGet("href") ?? "";
    if (/^https?:\/\//.test(href)) {
      t.attrSet("target", "_blank");
      t.attrSet("rel", "noopener noreferrer");
      let j = i + 1, text = "", hasCode = false;
      for (; j < tokens.length && tokens[j].type !== "link_close"; j++) {
        text += tokens[j].content;
        if (tokens[j].type === "code_inline") hasCode = true;
      }
      if (!hasCode && !/\u2197\s*$/.test(text)) t.attrJoin("class", "ext");
    }
    return self.renderToken(tokens, i, o);
  };

  // images lazy-load; tables scroll inside a frame
  const img = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, i, o, env, self) => {
    tokens[i].attrSet("loading", "lazy");
    return img(tokens, i, o, env, self);
  };
  md.renderer.rules.table_open = () => `<div class="tablewrap"><table>\n`;
  md.renderer.rules.table_close = () => `</table></div>\n`;

  return md;
}

let md: MarkdownIt | null = null;

const DIRECTIVE = /^:::(release-table)\s*$/gm;

export function renderMarkdown(src: string, ids: Map<string, number> = new Map()): { html: string; headings: MdHeading[] } {
  md ??= build();
  const env: Env = { ids, headings: [] };
  // directives become a placeholder paragraph, swapped for a sentinel div
  const text = src.replace(/\r\n/g, "\n").replace(DIRECTIVE, (_m, name) => `\n@@directive:${name}@@\n`);
  const html = md
    .render(text, env)
    .replace(/<p>@@directive:([a-z-]+)@@<\/p>/g, (_m, name) => `<div data-directive="${name}"></div>`);
  return { html, headings: env.headings };
}

export function markdownToHtml(src: string): string {
  return renderMarkdown(src).html;
}
