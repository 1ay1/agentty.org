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

const COMMANDS = /^(agentty|which|ssh-copy-id|xdg-open|open|kill|ps|jq|tail|head|less|tee|env|time|watch|nc|ollama|git|npm|npx|node|pnpm|yarn|cargo|make|cmake|ninja|curl|wget|ssh|scp|rsync|docker|kubectl|brew|apt|apt-get|dnf|pacman|yay|paru|pip|pipx|uv|python3?|go|rustup|sudo|cd|ls|cat|grep|rg|find|sed|awk|chmod|mkdir|rm|cp|mv|echo|export|source|tmux|ollama|iw|ip|systemctl|journalctl|irm|winget|scoop|choco|nix|snap|emerge|apk|zypper|code|zed|vim|nvim)(\s|$)/;
// agentty's tools, by the names the model calls them: a mention of one is a
// code symbol, never a shell command (`grep` the tool, not grep the program)
const TOOLS = new Set(["read", "edit", "write", "apply_patch", "move", "remove", "shell", "bash", "process_start",
  "process_poll", "process_stop", "grep", "glob", "list_dir", "search_structural", "extract", "aggregate",
  "read_filter", "replace", "json_query", "outline", "repo_map", "find_definition", "diagnostics", "test",
  "git_status", "git_diff", "git_log", "git_show", "git_blame", "git_commit", "git_branch", "git_stash",
  "git_rebase", "git_cherry_pick", "web_fetch", "web_search", "remember", "forget", "wipe_memory", "task",
  "skill", "search_docs", "search_code", "rewrite_structural", "todo"]);
const FILE_EXT = /\.(json|toml|ya?ml|md|txt|sh|py|js|ts|tsx|cpp|hpp|c|h|rs|go|lock|conf|cfg|ini|env|log|pem|html|css|plist|service|socket|desktop|zip|tar|gz|deb|rpm|exe|ps1|sock|jsonl|ansi|cmake|png|gif|webp|svg|tcp)$/i;

/** What a piece of inline code is, by the colour it gets. */
type CodeKind = "" | "path" | "cmd" | "env" | "sym" | "flag" | "val";
function codeKind(t: string): CodeKind {
  const s = t.trim();
  if (!s || s.length > 160) return "";
  if (TOOLS.has(s)) return "sym";
  // a place: a URL, a domain, host:port, or a path that starts at a placeholder
  if (/^(https?|wss?|ircs?):\/\//.test(s) || /^[\w.-]+\.(com|org|net|io|dev|ai|sh|app|so)(\/\S*)?$/.test(s)) return "path";
  if (/^(localhost|[\d.]+|[\w-]+(\.[\w-]+)*|\[[\d:a-f]+\]):\d{2,5}$/.test(s) || s === "host:port") return "path";
  if (/^(<[\w-]+>|\$[A-Z_]+|%[A-Z_]+%)[\\/]/.test(s)) return "path";
  // several variables in one span: A / B / C
  if (/^\$?[A-Z][A-Z0-9_*<>]+( \/ \$?[A-Z][A-Z0-9_*<>]+)+$/.test(s)) return "env";
  // a command you'd type: a known program WITH arguments (a bare `ssh` is a name)
  if (COMMANDS.test(s) && /\s\S/.test(s)) return "cmd";
  if (/^\/[a-z][a-z-]*( .*)?$/.test(s) && !/^\/(tmp|usr|etc|var|opt|bin|dev|proc|sys|home|mnt|run)\b/.test(s)) return "cmd";   // /compact, /model
  // $FOO, FOO=1, FOO_BAR, or a well-known one: an environment variable
  if (/^\$?[A-Z][A-Z0-9_]*(_\*|_<[A-Z]+>)?(=\S*)?$/.test(s) && (/[_=$]/.test(s) || /^(PATH|HOME|TERM|SHELL|EDITOR|VISUAL|LANG|USER|DISPLAY|TMPDIR|PAGER)$/.test(s))) return "env";
  // an option flag: --setup, -m, --profile ask
  if (/^--?[A-Za-z][\w-]*(=\S*)?( \S+)?$/.test(s)) return "flag";
  // a setting written as key=value (wire=trace, warn,auth=debug)
  if (/^[a-z][\w.-]*=\S+$/.test(s) || /^[a-z]+(,[a-z]+=[a-z]+)+$/.test(s)) return "flag";
  // a model name: qwen3-embedding:0.6b, qwen2.5:0.5b
  if (/^[a-z][\w.-]*:[\w.]+$/.test(s) && /\d/.test(s)) return "val";
  // a value: a number, size or duration, a quoted string, true / false / null
  if (/^-?\d[\d.,_]*\s?(%|[kKMGT]i?B?|ms|s|m|h|px|x|×)?$/.test(s) || /^(["']).*\1$/.test(s) || /^(true|false|null|none|nil|on|off|yes|no)$/i.test(s)
      || /^=\S+$/.test(s) || /^[{[].*[}\]]$/.test(s)) return "val";
  // a code symbol: resolve(), std::move, Model::update, maya::Element
  if (/^[A-Za-z_~][\w:<>~]*\(.*\)$/.test(s) || /^[A-Za-z_]\w*(::[\w~<>]+)+$/.test(s)) return "sym";
  if (/\s/.test(s)) return "";
  // a path: starts at ~ / ./ ../ or /x, ends in a slash, or names a file
  if (/^(~|\.{1,2}\/|\/[\w.-])/.test(s) || /^\.[\w-]/.test(s)) return "path";
  if (/^[\w.@-]+(\/[\w.@*<>-]*)+$/.test(s) && (/\/$/.test(s) || FILE_EXT.test(s))) return "path";
  if (/^[\w.-]+$/.test(s) && FILE_EXT.test(s)) return "path";
  // a name from code: snake_case, CONSTANT, CamelCase, dotted.setting.name
  if (/^[A-Za-z_][\w]*$/.test(s) && (/_/.test(s) || /^[A-Z][A-Z0-9]{2,}$/.test(s) || /^[A-Z][a-z]+[A-Z]\w*$/.test(s) || /^[a-z]+[A-Z]\w*$/.test(s))) return "sym";
  if (/^[a-z_][\w-]*(\.[\w-]+)+$/.test(s) && !FILE_EXT.test(s)) return "sym";
  // a protocol method or a header: session/new, tools/call, $/cancel_request, Retry-After
  if (/^(\$|[a-z_]+)(\/[a-z_*]+)+$/.test(s) || /^[A-Z][a-z]+(-[A-Z][a-z]+)+$/.test(s)) return "sym";
  // a single plain word: a mode, state or keyword value (none, partial, ask)
  if (/^[a-z][a-z0-9-]*$/.test(s)) return "val";
  return "";
}

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

  // inline code takes a colour by what it is, the way agentty colours its own
  // output: a path or file (cyan), a command you'd type (green), an
  // environment variable or setting (yellow). Anything else stays ink.
  md.renderer.rules.code_inline = (tokens, i) => {
    const t = tokens[i].content;
    const kind = codeKind(t);
    return `<code${kind ? ` class="c-${kind}"` : ""}>${esc(t)}</code>`;
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
  const { text: noted, notes } = footnotes(preprocess(src));
  const text = noted;
  const html = md
    .render(text, env)
    .replace(/<p>@@directive:([a-z-]+)(?::([a-z0-9,-]+))?@@<\/p>/g, (_m: string, name: string, arg?: string) =>
      `<div data-directive="${name}${arg ? `:${arg}` : ""}"></div>`,
    )
    // [^x] → a margin note beside the line that cites it (a block under the
    // paragraph where there is no margin). The number is the link both ways.
    .replace(/@@sn:(\d+)@@/g, (_m: string, n: string) =>
      `<label class="sn-ref" for="sn-${n}" id="sn-ref-${n}">${n}</label><input type="checkbox" class="sn-toggle" id="sn-${n}" aria-label="Note ${n}" />` +
      `<span class="sn" role="note"><span class="sn-n">${n}</span> ${md!.renderInline(notes[Number(n) - 1] ?? "")}</span>`,
    );
  return { html, headings: env.headings };
}

// Footnote definitions (`[^id]: text`, one line) are lifted out; each first
// reference becomes a numbered placeholder. Undefined refs are left as typed.
function footnotes(src: string): { text: string; notes: string[] } {
  const defs = new Map<string, string>();
  const body = src.replace(/^\[\^([^\]\s]+)\]:[ \t]+(.+)$\n?/gm, (_m, id: string, t: string) => (defs.set(id, t.trim()), ""));
  if (!defs.size) return { text: src, notes: [] };
  const order: string[] = [];
  let fence = false;
  const text = body.split("\n").map((line) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) return line;
    return line.replace(/\[\^([^\]\s]+)\]/g, (m, id: string) => {
      if (!defs.has(id)) return m;
      let i = order.indexOf(id);
      if (i < 0) i = order.push(id) - 1;
      return `@@sn:${i + 1}@@`;
    });
  }).join("\n");
  return { text, notes: order.map((id) => defs.get(id)!) };
}

export function markdownToHtml(src: string): string {
  return renderMarkdown(src).html;
}
