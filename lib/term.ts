// agentty.org in a terminal: `curl agentty.org/<page>` gets the page rendered
// as text for an 80-column terminal, with the site's own design rules —
// one left edge at column 4, markers (`##`, `-`, `$`) hung into the margin,
// one accent (magenta) spent rarely, faint for the quiet parts.
//
// Colours are the terminal's own 16 (magenta, faint, bold), so the page takes
// on the reader's theme, light or dark. Links are OSC 8 hyperlinks: clickable
// where the terminal supports them, plain text everywhere else.

import type MarkdownIt from "markdown-it";
type Token = ReturnType<InstanceType<typeof MarkdownIt>["parse"]>[number];
import { parser, preprocess, CALLOUT_KINDS } from "./markdown";
import { commandLines } from "./highlight";
import { site } from "./site";

export const COLS = 80;
export const M = 4; // left margin: markers hang into columns 0–3
export const W = 72; // text measure

// ── styles ──────────────────────────────────────────────────────────────
export type Style = { b?: boolean; d?: boolean; i?: boolean; u?: boolean; fg?: number; href?: string };
export type Seg = { t: string; s: Style };

export const MAGENTA = 35, GREEN = 32, YELLOW = 33, CYAN = 36;

export function paint(text: string, s: Style = {}): string {
  if (!text) return "";
  const c: number[] = [];
  if (s.b) c.push(1);
  if (s.d) c.push(2);
  if (s.i) c.push(3);
  if (s.u) c.push(4);
  if (s.fg) c.push(s.fg);
  let out = c.length ? `\x1b[${c.join(";")}m${text}\x1b[0m` : text;
  if (s.href) out = `\x1b]8;;${s.href}\x1b\\${out}\x1b]8;;\x1b\\`;
  return out;
}
export const bold = (t: string) => paint(t, { b: true });
export const dim = (t: string) => paint(t, { d: true });
export const accent = (t: string, b = false) => paint(t, { fg: MAGENTA, b });
export const link = (t: string, href: string, s: Style = {}) => paint(t, { ...s, href });

/** Visible width: wide (CJK, emoji) = 2, combining/joiners = 0. */
export function vw(str: string): number {
  // eslint-disable-next-line no-control-regex
  const plain = str.replace(/\x1b\]8;;[^\x1b]*\x1b\\/g, "").replace(/\x1b\[[0-9;:]*m/g, "");
  let w = 0;
  for (const ch of plain) {
    const cp = ch.codePointAt(0)!;
    if ((cp >= 0x300 && cp <= 0x36f) || cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f)) continue;
    if (
      (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6) ||
      (cp >= 0x1f300 && cp <= 0x1faff) || (cp >= 0x2600 && cp <= 0x27bf && cp !== 0x2713 && cp !== 0x2717)
    ) w += 2;
    else w += 1;
  }
  return w;
}
export const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - vw(s)));
export const padStart = (s: string, n: number) => " ".repeat(Math.max(0, n - vw(s))) + s;

const sameStyle = (a: Style, b: Style) =>
  !!a.b === !!b.b && !!a.d === !!b.d && !!a.i === !!b.i && !!a.u === !!b.u && a.fg === b.fg && a.href === b.href;

export function paintSegs(segs: Seg[]): string {
  const merged: Seg[] = [];
  for (const g of segs) {
    const last = merged[merged.length - 1];
    if (last && sameStyle(last.s, g.s)) last.t += g.t;
    else merged.push({ t: g.t, s: g.s });
  }
  return merged.map((g) => paint(g.t, g.s)).join("");
}

// ── wrapping ────────────────────────────────────────────────────────────
type Item = { k: "w"; segs: Seg[]; w: number } | { k: "s"; s: Style } | { k: "br" };

/** Greedy word wrap of styled segments to `width` columns. */
export function wrapSegs(segs: Seg[], width: number): Seg[][] {
  const items: Item[] = [];
  let cur: Seg[] | null = null;
  const flush = () => {
    if (cur) items.push({ k: "w", segs: cur, w: cur.reduce((a, x) => a + vw(x.t), 0) });
    cur = null;
  };
  for (const g of segs) {
    if (g.t === "\n") { flush(); items.push({ k: "br" }); continue; }
    for (const part of g.t.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { flush(); items.push({ k: "s", s: g.s }); }
      else (cur ??= []).push({ t: part, s: g.s });
    }
  }
  flush();

  const lines: Seg[][] = [[]];
  let col = 0;
  let space: Style | null = null;
  const nl = () => { lines.push([]); col = 0; space = null; };
  for (const it of items) {
    if (it.k === "br") { nl(); continue; }
    if (it.k === "s") { if (col > 0) space = it.s; continue; }
    if (col > 0 && col + (space ? 1 : 0) + it.w > width) nl();
    if (space) { lines[lines.length - 1].push({ t: " ", s: space }); col += 1; space = null; }
    if (it.w <= width - col) {
      lines[lines.length - 1].push(...it.segs);
      col += it.w;
      continue;
    }
    // a single word wider than the line: break after | / , = first (option
    // lists, paths, key=value), and by characters only as a last resort
    const parts: Seg[][] = [];
    for (const g of it.segs) for (const piece of g.t.split(/(?<=[|/,=])/)) parts.push([{ t: piece, s: g.s }]);
    for (const part of parts) {
      const pw = vw(part[0].t);
      if (col > 0 && col + pw > width) nl();
      if (pw <= width - col) { lines[lines.length - 1].push(...part); col += pw; continue; }
      for (const ch of part[0].t) {
        if (col + vw(ch) > width) nl();
        lines[lines.length - 1].push({ t: ch, s: part[0].s });
        col += vw(ch);
      }
    }
  }
  while (lines.length > 1 && lines[lines.length - 1].length === 0) lines.pop();
  return lines;
}

export const wrap = (segs: Seg[], width: number) => wrapSegs(segs, width).map(paintSegs);
export const wrapText = (text: string, width: number, s: Style = {}) => wrap([{ t: text, s }], width);

// ── page lines ──────────────────────────────────────────────────────────
// A line is a body (starting at the text edge) plus an optional marker that
// hangs into the margin to its left.
export type Line = { hang?: string; text: string; raw?: boolean };

export const L = (text = "", hang?: string): Line => ({ text, hang });

export function frame(lines: Line[]): string {
  const out = lines.map((l) => {
    if (l.raw) return l.text.replace(/\s+$/, "");
    const h = l.hang ? padStart(l.hang, M - 1) + " " : " ".repeat(M);
    return (l.text ? h + l.text : l.hang ? h.trimEnd() : "").replace(/\s+$/, "");
  });
  // collapse runs of blank lines, trim the ends
  const clean: string[] = [];
  for (const l of out) if (!(l === "" && clean[clean.length - 1] === "")) clean.push(l);
  while (clean[0] === "") clean.shift();
  while (clean[clean.length - 1] === "") clean.pop();
  return "\n" + clean.join("\n") + "\n\n";
}

// ── links ───────────────────────────────────────────────────────────────
const ORIGIN = site.url.replace(/\/$/, "");
export function absUrl(href: string): string {
  if (/^https?:\/\//.test(href)) return href;
  if (href.startsWith("#")) return "";
  if (href.startsWith("/")) return ORIGIN + href;
  return href;
}
/** "agentty.org/docs/sandboxing" — what you'd type after `curl`. */
export function curlPath(href: string): string {
  const p = href.replace(/^https?:\/\/[^/]+/, "").replace(/[#?].*$/, "").replace(/\/+$/, "");
  return "agentty.org" + p;
}

// ── markdown → lines ────────────────────────────────────────────────────
export type Directive = (name: string, arg: string | undefined, width: number) => Line[];
export type RunCapture = (cmd: string) => { output: string; version: string } | null;
type Ctx = { directive?: Directive; run?: RunCapture };

function inline(children: Token[] | null, base: Style = {}, ticks = true): Seg[] {
  const out: Seg[] = [];
  const stack: Style[] = [base];
  const top = () => stack[stack.length - 1];
  for (const t of children ?? []) {
    switch (t.type) {
      case "text": out.push({ t: t.content, s: top() }); break;
      case "softbreak": out.push({ t: " ", s: top() }); break;
      case "hardbreak": out.push({ t: "\n", s: top() }); break;
      case "strong_open": stack.push({ ...top(), b: true }); break;
      case "em_open": stack.push({ ...top(), i: true }); break;
      case "s_open": stack.push({ ...top(), d: true }); break;
      case "link_open": {
        const href = absUrl(String(t.attrGet("href") ?? ""));
        stack.push(href ? { ...top(), u: true, href } : { ...top() });
        break;
      }
      case "strong_close": case "em_close": case "s_close": case "link_close": stack.pop(); break;
      case "code_inline": {
        const tick = { ...top(), d: true, u: false, b: false };
        if (ticks) out.push({ t: "`", s: tick }, { t: t.content, s: { ...top(), d: false } }, { t: "`", s: tick });
        else out.push({ t: t.content, s: { ...top(), d: false } });
        break;
      }
      case "kbd": out.push({ t: t.content, s: { ...top(), b: true } }); break;
      case "image": out.push({ t: `[image: ${t.content || "figure"}]`, s: { ...top(), d: true } }); break;
    }
  }
  return out;
}

const plainOf = (children: Token[] | null) =>
  (children ?? []).filter((c) => ["text", "code_inline", "kbd"].includes(c.type)).map((c) => c.content).join("");

const COMMENT: Record<string, RegExp> = {
  "#": /^(\s*)(#.*)$/,
  "//": /^(\s*)(\/\/.*)$/,
};
const HASH_LANGS = new Set(["bash", "sh", "shell", "zsh", "toml", "yaml", "yml", "ini", "python", "py", "cmake", "", "text", "console"]);
const SLASH_LANGS = new Set(["js", "javascript", "ts", "typescript", "jsonc", "cpp", "c++", "c", "rust", "go", "json5"]);
const SHELL = new Set(["bash", "sh", "shell", "zsh"]);

/** Comment-dimmed code line. Trailing `# …` in shell is dimmed when unquoted. */
function codeLine(line: string, lang: string): string {
  if (HASH_LANGS.has(lang)) {
    const m = line.match(COMMENT["#"]);
    if (m && !line.startsWith("#!")) return m[1] + dim(m[2]);
    if (SHELL.has(lang)) {
      const at = line.search(/\s#\s/);
      if (at > 0 && (line.slice(0, at).match(/['"]/g) ?? []).length % 2 === 0) return line.slice(0, at) + dim(line.slice(at));
    }
  }
  if (SLASH_LANGS.has(lang)) {
    const m = line.match(COMMENT["//"]);
    if (m) return m[1] + dim(m[2]);
  }
  return line;
}

/** Lines placed at an absolute column (not re-wrapped): `indent` spaces, as close
 *  to `want` as fits in 80 columns, never left of column 0. */
export function placed(rows: string[], want: number): Line[] {
  const w = Math.max(0, ...rows.map(vw));
  const indent = Math.max(0, Math.min(want, COLS - w));
  return rows.map((r) => ({ text: r ? " ".repeat(indent) + r : "", raw: true }));
}

/** A fenced block, man-page style: 4 past the text edge, `$` hung before
 *  commands; a block too wide for that moves left until it fits 80 columns. */
function codeBlock(content: string, lang: string, depth: number): Line[] {
  const code = content.replace(/\n$/, "");
  const shell = SHELL.has(lang) && !code.split("\n").some((l) => l.startsWith("$ "));
  const cmds = shell ? commandLines(code) : [];
  const lines = code.split("\n");
  // only blocks with prompts get the two-column `$ ` gutter
  const gutter = shell ? cmds.some(Boolean) : lines.some((l) => l.startsWith("$ "));
  const rows = lines.map((line, i) => {
    if (!gutter) return codeLine(line, lang);
    if (!shell && line.startsWith("$ ")) return accent("$") + " " + codeLine(line.slice(2), lang);
    return (cmds[i] ? accent("$") + " " : "  ") + codeLine(line, lang);
  });
  return placed(rows, (gutter ? M + 2 : M + 4) + depth * 2);
}

function table(tokens: Token[], i0: number, i1: number, width: number): Line[] {
  type Cell = { segs: Seg[]; plain: string; right: boolean };
  const rows: Cell[][] = [];
  let head = 0;
  let row: Cell[] | null = null;
  for (let i = i0; i < i1; i++) {
    const t = tokens[i];
    if (t.type === "tr_open") row = [];
    else if (t.type === "tr_close") { if (row) rows.push(row); row = null; }
    else if (t.type === "thead_close") head = rows.length;
    else if ((t.type === "th_open" || t.type === "td_open") && row) {
      const inl = tokens[i + 1];
      const plain = plainOf(inl.children);
      const right = /text-align:right/.test(String(t.attrGet("style") ?? "")) ||
        /^[~≈<>]?\s*[\d.,]+\s*(ms|s|MB|KB|GB|B|%|×|x)?$/.test(plain.trim()) && !/^\d+$/.test(plain.trim());
      row.push({ segs: inline(inl.children, {}, false), plain, right });
    }
  }
  if (rows.length === 0) return [];
  const n = Math.max(...rows.map((r) => r.length));
  // right-align a column only when every body cell in it is a number
  for (let c = 0; c < n; c++) {
    const body = rows.slice(head).map((r) => r[c]).filter(Boolean);
    const numeric = body.length > 0 && body.every((x) => x.right || !x.plain.trim());
    for (const r of rows) if (r[c]) r[c].right = numeric;
  }
  const gap = 3;
  const natural = Array.from({ length: n }, (_, c) => Math.max(1, ...rows.map((r) => (r[c] ? vw(r[c].plain) : 0))));
  const longest = Array.from({ length: n }, (_, c) =>
    Math.min(18, Math.max(1, ...rows.map((r) => Math.max(0, ...(r[c]?.plain.split(/\s+/).map(vw) ?? [0]))))));
  const avail = width - gap * (n - 1);
  let widths = natural;
  if (natural.reduce((a, b) => a + b, 0) > avail) {
    const min = longest.reduce((a, b) => a + b, 0);
    if (min > avail) {
      // too many columns for 72: one record per row instead
      const out: Line[] = [];
      const header = head ? rows[0] : null;
      rows.slice(head).forEach((r, ri) => {
        if (ri) out.push(L());
        r.forEach((cell, c) => {
          if (c === 0) { wrap(cell.segs.map((g) => ({ ...g, s: { ...g.s, b: true } })), width).forEach((x) => out.push(L(x))); return; }
          const label = header?.[c]?.plain ?? "";
          const lw = Math.min(16, Math.max(...(header ?? []).map((h) => vw(h.plain))) + 2);
          wrap(cell.segs, width - lw).forEach((x, k) => out.push(L((k ? " ".repeat(lw) : dim(pad(label, lw))) + x)));
        });
      });
      return out;
    }
    const extra = avail - min;
    const want = natural.map((w, c) => w - longest[c]);
    const total = want.reduce((a, b) => a + b, 0) || 1;
    widths = longest.map((w, c) => w + Math.floor((extra * want[c]) / total));
  }
  const tw = widths.reduce((a, b) => a + b, 0) + gap * (n - 1);
  const rule = L(dim("─".repeat(tw)));
  const rendered = rows.map((r, ri) => {
    const cols = widths.map((w, c) => {
      const cell = r[c];
      if (!cell) return [""];
      const segs = ri < head ? cell.segs.map((g) => ({ ...g, s: { ...g.s, d: true, b: false } })) : cell.segs;
      return wrap(segs, w);
    });
    const h = Math.max(...cols.map((x) => x.length));
    return Array.from({ length: h }, (_, k) =>
      widths
        .map((w, c) => {
          const text = cols[c][k] ?? "";
          return r[c]?.right ? padStart(text, w) : c === n - 1 ? text : pad(text, w);
        })
        .join(" ".repeat(gap)),
    );
  });
  const multi = rendered.slice(head).some((r) => r.length > 1);
  const out: Line[] = [rule];
  rendered.forEach((r, ri) => {
    if (ri === head && head) out.push(rule);
    else if (ri > head && multi) out.push(L());
    r.forEach((x) => out.push(L(x)));
  });
  out.push(rule);
  return out;
}

function blocks(tokens: Token[], from: number, to: number, width: number, ctx: Ctx, depth = 0): Line[] {
  const out: Line[] = [];
  const gap = () => { if (out.length && out[out.length - 1].text !== "") out.push(L()); };
  const close = (i: number, open: string, closeT: string) => {
    let lvl = 0;
    for (let j = i; j < to; j++) {
      if (tokens[j].type === open) lvl++;
      else if (tokens[j].type === closeT && --lvl === 0) return j;
    }
    return to;
  };
  let i = from;
  while (i < to) {
    const t = tokens[i];
    switch (t.type) {
      case "paragraph_open": {
        const inl = tokens[i + 1];
        const m = inl.content.match(/^@@directive:([a-z-]+)(?::([a-z0-9,-]+))?@@$/);
        gap();
        if (m && ctx.directive) out.push(...ctx.directive(m[1], m[2], width));
        else wrap(inline(inl.children), width).forEach((x) => out.push(L(x)));
        i += 3;
        break;
      }
      case "heading_open": {
        const level = Number(t.tag.slice(1));
        const text = wrap(inline(tokens[i + 1].children, { b: true }), width);
        gap();
        if (level <= 2) out.push(L());
        const hang = level === 2 ? "##" : level === 3 ? "###" : undefined;
        text.forEach((x, k) => out.push(L(level >= 4 ? x : x, k === 0 && depth === 0 ? (hang ? dim(hang) : undefined) : undefined)));
        if (level <= 2) out.push(L());
        i += 3;
        break;
      }
      case "fence":
      case "code_block": {
        gap();
        const lang = (t.info || "").trim().split(/\s+/)[0].toLowerCase();
        if (lang === "run" && ctx.run) {
          const cmd = t.content.trim();
          const cap = ctx.run(cmd);
          const rows = [accent("$") + " " + cmd];
          // the real output, placed (never re-wrapped) as close to the code
          // column as 80 columns allow
          if (cap) {
            const outRows = cap.output.replace(/\n+$/, "").split("\n");
            const pre = Math.max(...outRows.map(vw)) + 2 <= COLS ? "  " : "";
            rows.push(...outRows.map((x) => pre + x));
          }
          out.push(...placed(rows, M + 2));
          if (cap) out.push(...placed([dim(`  output from ${cap.version}, captured at build`)], M + 2));
        } else out.push(...codeBlock(t.content, lang, depth));
        i++;
        break;
      }
      case "bullet_list_open":
      case "ordered_list_open": {
        const end = close(i, t.type, t.type.replace("_open", "_close"));
        const ordered = t.type === "ordered_list_open";
        let n = Number(t.attrGet("start") ?? 1);
        gap();
        let j = i + 1;
        let first = true;
        while (j < end) {
          if (tokens[j].type !== "list_item_open") { j++; continue; }
          const itemEnd = close(j, "list_item_open", "list_item_close");
          const marker = ordered ? `${n++}.` : "-";
          const inner = blocks(tokens, j + 1, itemEnd, depth === 0 ? width : width - (ordered ? 3 : 2), ctx, depth + 1);
          const tight = !inner.some((l, k) => l.text === "" && k > 0 && k < inner.length - 1);
          if (!first && !tight) out.push(L());
          first = false;
          const body = inner.filter((l, k) => !(l.text === "" && (k === 0 || k === inner.length - 1)));
          body.forEach((l, k) => {
            if (l.raw) { out.push(l); return; }
            if (depth === 0) out.push(L(l.text, k === 0 ? dim(marker) : l.hang));
            else out.push(L((k === 0 ? dim(pad(marker, ordered ? 3 : 2)) : " ".repeat(ordered ? 3 : 2)) + l.text));
          });
          j = itemEnd + 1;
        }
        i = end + 1;
        break;
      }
      case "blockquote_open": {
        const end = close(i, "blockquote_open", "blockquote_close");
        gap();
        blocks(tokens, i + 1, end, width - 2, ctx, depth + 1).forEach((l) => out.push(l.raw ? l : L(dim("│ ") + paint(l.text.replace(/\x1b\[0m/g, "\x1b[0m\x1b[3m"), { i: true }))));
        i = end + 1;
        break;
      }
      case "container_callout_open": {
        const end = close(i, "container_callout_open", "container_callout_close");
        const m = t.info.trim().match(/^([a-z]+)\s*(.*)$/);
        const kind = m ? CALLOUT_KINDS[m[1]]?.[0] ?? "note" : "note";
        const fg = kind === "warn" ? YELLOW : kind === "tip" ? GREEN : undefined;
        const bar = paint("│", fg ? { fg } : { d: true });
        gap();
        const title = m?.[2]?.trim();
        const label = paint(kind, fg ? { fg } : { d: true });
        out.push(L(bar + " " + label + (title ? "  " + paintSegs(inline(parser().parseInline(title, {})[0]?.children ?? null, { b: true })) : "")));
        blocks(tokens, i + 1, end, width - 2, ctx, depth + 1)
          .filter((l, k, a) => !(l.text === "" && (k === 0 || k === a.length - 1)))
          .forEach((l) => out.push(l.raw ? l : L(l.text ? bar + " " + l.text : bar)));
        i = end + 1;
        break;
      }
      case "table_open": {
        const end = close(i, "table_open", "table_close");
        gap();
        out.push(...table(tokens, i, end, width));
        i = end + 1;
        break;
      }
      case "hr": gap(); out.push(L(dim("─".repeat(width)))); i++; break;
      default: i++;
    }
  }
  return out;
}

/** Markdown body → lines at the text edge. */
export function markdownLines(src: string, ctx: Ctx = {}, width = W): Line[] {
  const tokens = parser().parse(preprocess(src), {});
  return blocks(tokens, 0, tokens.length, width, ctx);
}

// ── bars ────────────────────────────────────────────────────────────────
const EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];
/** A bar `cells` wide at most, `frac` of it filled, in eighths of a cell. */
export function barText(frac: number, cells: number): string {
  const e = Math.max(1, Math.round(frac * cells * 8));
  return "█".repeat(Math.floor(e / 8)) + EIGHTHS[e % 8];
}
