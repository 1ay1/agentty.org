// Markdown → HTML for every content page (docs, blog, guides, compare, pages,
// changelog). Build time only: markdown-it is a full CommonMark parser, so
// nested lists, code blocks inside list items, multi-paragraph items, tables,
// and blockquotes all render correctly. Raw HTML in content is NOT passed
// through (html: false) — output is safe by construction.
//
// Site extensions on top of CommonMark:
//   [[Ctrl+K]]                  → <kbd>Ctrl+K</kbd> (with a hover clip if one is recorded)
//   [text](clip:<id>)           → hovering the text plays the real agentty (lib/clips.ts)
//   :::tip|note|warn [label]    → callout (body is full markdown); aliases:
//   … :::                         warning, caution, danger, important, info, hint
//   :::release-table            → directive sentinel, rendered by DocBody
//   :::bench claude,codex       → measured bars, agentty vs those tools (DocBody)
//   ```lang                     → build-time syntax highlighting (lib/highlight)
//   headings                    → stable unique ids + a self-link anchor
//   external links              → open in a new tab, marked ↗
import MarkdownIt from "markdown-it";

type MD = InstanceType<typeof MarkdownIt>;
import container from "markdown-it-container";
import { highlight } from "./highlight";
import { slash } from "./url";
import captured from "./captured.generated.json";
import { clips, clipFor } from "./clips";

// ```run blocks: the command, then its real output from the binary, captured
// at build by scripts/capture-output.mjs. The copy button copies the command.
const caps = captured as { version: string; outputs: Record<string, string> };
function runBlock(cmd: string): string {
  const out = caps.outputs[cmd];
  const e = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return (
    `<div class="codeblock run"><div class="codeblock-head"><span>${out !== undefined ? `output from ${e(caps.version)}, captured at build` : "sh"}</span>` +
    `<button type="button" class="codeblock-copy" aria-label="Copy command" data-copy="${e(cmd).replace(/"/g, "&quot;")}">copy</button></div>` +
    `<pre class="code"><code><span class="line cmd">${e(cmd)}</span>` +
    (out !== undefined ? "\n" + out.split("\n").map((l) => `<span class="line out">${e(l)}</span>`).join("\n") : "") +
    `</code></pre></div>\n`
  );
}

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

type Env = { ids: Map<string, number>; headings: MdHeading[]; sections?: string[] };

function build(): MD {
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
  // a key with a recorded clip shows the real agentty doing it on hover
  // which clip depends on where the key is mentioned: Ctrl+R reviews diffs in
  // the main view but renames a thread in the thread list (scripts/demo-clips.mjs)
  md.renderer.rules.kbd = (tokens, i, _o, envAny) => {
    const env = envAny as Env;
    const clip = clipFor(tokens[i].content, env.sections ?? []);
    return clip
      ? `<kbd class="clip-ref" data-clip="${clip}" tabindex="0">${esc(tokens[i].content)}</kbd>`
      : `<kbd>${esc(tokens[i].content)}</kbd>`;
  };

  // callouts
  md.use(container, "callout", {
    validate: (params: string) => {
      const m = params.trim().match(/^([a-z]+)\b/);
      return !!m && m[1] in CALLOUTS;
    },
    render: (tokens: { nesting: number; info: string }[], i: number) => {
      if (tokens[i].nesting !== 1) return "</aside>\n";
      const m = tokens[i].info.trim().match(/^([a-z]+)\s*(.*)$/)!;
      const [type] = CALLOUTS[m[1]];
      const cls = type === "note" ? "note" : `note ${type}`;
      // the kind (note / tip / warn) is drawn in the margin by CSS; only a
      // real title is rendered inline
      const title = m[2].trim();
      return `<aside class="${cls}" role="note">${title ? `<span class="label">${md.renderInline(title)}</span>` : ""}\n`;
    },
  });

  // fenced code → highlighted block with header (language, copy)
  md.renderer.rules.fence = (tokens, i) => {
    const t = tokens[i];
    if ((t.info || "").trim() === "run") return runBlock(t.content.trim());
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
  md.renderer.rules.heading_open = (tokens, i, _o, envAny) => {
    const env = envAny as Env;
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
    // the section path a key is mentioned under ([h2, h3, …])
    env.sections = [...(env.sections ?? []).slice(0, Math.max(0, level - 2)), plain.trim()];
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
    const href = String(t.attrGet("href") ?? "");
    // [the command palette](clip:command-palette): hover shows the clip
    if (href.startsWith("clip:")) {
      const id = href.slice(5);
      // not recorded (yet): just the words
      if (!clips[id]) {
        for (let j = i + 1; j < tokens.length; j++) if (tokens[j].type === "link_close") { tokens[j].tag = "span"; break; }
        return "<span>";
      }
      for (let j = i + 1; j < tokens.length; j++) if (tokens[j].type === "link_close") { tokens[j].tag = "span"; break; }
      return `<span class="clip-ref" data-clip="${id}" tabindex="0" role="button">`;
    }
    if (href.startsWith("/")) t.attrSet("href", slash(href));
    if (/^https?:\/\//.test(href)) {
      t.attrSet("target", "_blank");
      t.attrSet("rel", "noopener noreferrer");
      let j = i + 1, text = "", hasCode = false;
      for (; j < tokens.length && tokens[j].type !== "link_close"; j++) {
        text += String(tokens[j].content);
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

let md: MD | null = null;

const DIRECTIVE = /^:::(release-table|bench)(?:[ \t]+([a-z0-9, -]+?))?[ \t]*$/gm;

// directives become a placeholder paragraph: `@@directive:name[:arg]@@`
export function preprocess(src: string): string {
  return src
    .replace(/\r\n/g, "\n")
    .replace(DIRECTIVE, (_m: string, name: string, arg?: string) => `\n@@directive:${name}${arg ? `:${arg.replace(/\s+/g, "")}` : ""}@@\n`);
}

/** The site's configured markdown-it (callouts, [[kbd]]), for other renderers. */
export function parser(): MD {
  return (md ??= build());
}

export const CALLOUT_KINDS = CALLOUTS;

export function renderMarkdown(src: string, ids: Map<string, number> = new Map()): { html: string; headings: MdHeading[] } {
  md ??= build();
  const env: Env = { ids, headings: [] };
  // directives become a placeholder paragraph, swapped for a sentinel div
  const text = preprocess(src);
  const html = md
    .render(text, env)
    .replace(/<p>@@directive:([a-z-]+)(?::([a-z0-9,-]+))?@@<\/p>/g, (_m: string, name: string, arg?: string) =>
      `<div data-directive="${name}${arg ? `:${arg}` : ""}"></div>`,
    );
  return { html, headings: env.headings };
}

export function markdownToHtml(src: string): string {
  return renderMarkdown(src).html;
}
