// The terminal edition of agentty.org: every page as an 80-column ANSI text
// document, built at build time (app/t/[...path]/route.ts) and served to
// curl / wget by nginx. Layout rules mirror the site (DESIGN.md).

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import bench from "./bench.generated.json";
import captured from "./captured.generated.json";
import { applyTokens } from "./docs-tokens";
import { getAllDocs, getDoc, getAdjacentDocs, getDocsNav } from "./docs";
import { getAllPosts } from "./blog";
import { getComparePages, getAlternativePages, getGuidePages, type SeoPage } from "./seo-pages";
import { getContentPages } from "./pages";
import { release, versionLabel } from "./release";
import { site } from "./site";
import { wordmarkRows } from "./wordmark";
import {
  type Line, L, frame, markdownLines, wrapText, wrap, bold, dim, accent, link, pad, padStart, vw,
  absUrl, curlPath, barText, W, type Directive, type RunCapture,
} from "./term";

// ── shared pieces ───────────────────────────────────────────────────────
const fmtMs = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v < 10 ? v.toFixed(1) : Math.round(v)} ms`);
const us = bench.tools.find((t) => t.id === "agentty")!;

function header(path: string): Line[] {
  const left = accent("▌") + " " + bold("agentty") + "  " + dim(versionLabel);
  let where = curlPath(path);
  const room = W - vw(left) - 2;
  if (vw(where) > room) where = "…" + where.slice(where.length - room + 1);
  return [L(left + " ".repeat(Math.max(2, W - vw(left) - vw(where))) + dim(where)), L()];
}

function title(text: string, lead?: string, kicker?: string): Line[] {
  const out: Line[] = [L()];
  if (kicker) out.push(L(dim(kicker)), L());
  wrapText(text, W, { b: true }).forEach((x) => out.push(L(x)));
  if (lead) { out.push(L()); wrapText(lead, W, { d: true }).forEach((x) => out.push(L(x))); }
  out.push(L());
  return out;
}

const curlCmd = (href: string) => dim("curl ") + curlPath(href);

/** A list of pages as `curl …` lines with their titles: man -k for the site. */
function pageList(items: { href: string; title: string }[]): Line[] {
  const fits = items.map((i) => vw("curl " + curlPath(i.href))).filter((n) => n <= 44);
  const w = Math.max(20, ...fits) + 3;
  const cut = (t: string, room: number) => (vw(t) > room ? t.slice(0, room - 1) + "…" : t);
  return items.flatMap((i) => {
    const cmd = link(curlCmd(i.href), absUrl(i.href + "/"));
    // a path too long for the column gets its title on the next line
    if (vw("curl " + curlPath(i.href)) > w - 2) return [L(cmd), L(" ".repeat(w) + dim(cut(i.title, W - w)))];
    return [L(pad(cmd, w) + cut(i.title, W - w))];
  });
}

function pager(prev?: { href: string; title: string }, next?: { href: string; title: string }): Line[] {
  if (!prev && !next) return [];
  const out: Line[] = [L(), L(dim("─".repeat(W)))];
  const row = (label: string, p: { href: string; title: string }) => {
    const cmd = link(curlCmd(p.href), absUrl(p.href + "/"));
    const t = vw(p.title) > W - 7 ? p.title.slice(0, W - 8) + "…" : p.title;
    out.push(L(dim(pad(label, 7)) + cmd), L(" ".repeat(7) + dim(t)));
  };
  if (prev) row("prev", prev);
  if (next) row("next", next);
  return out;
}

function footer(path: string): Line[] {
  const url = absUrl(path === "/" ? "/" : path + "/");
  return [
    L(), L(dim("─".repeat(W))),
    ...(vw(url) + 14 <= W ? [L(dim("in a browser  ") + link(url, url))] : [L(dim("in a browser")), L(link(url, url))]),
    L(dim("all pages     ") + curlCmd("/help")),
  ];
}

const page = (path: string, body: Line[], after: Line[] = []) =>
  frame([...header(path), ...body, ...after, ...footer(path)]);

// ── directives ──────────────────────────────────────────────────────────
type Tool = (typeof bench.tools)[number];
const METRICS: { key: string; label: string; v: (t: Tool) => number; fmt: (v: number) => string }[] = [
  { key: "ready", label: "launch → ready to type", v: (t) => t.readyMs.median, fmt: fmtMs },
  { key: "rss", label: "memory while idle", v: (t) => t.idleRssMB, fmt: (v) => `${Math.round(v)} MB` },
  { key: "disk", label: "on disk, with runtime", v: (t) => t.diskMB, fmt: (v) => `${Math.round(v)} MB` },
  { key: "startup", label: "--version startup", v: (t) => t.startupMs.median, fmt: fmtMs },
];

export function benchLines(metrics: string[], only?: string[], width = W): Line[] {
  const tools = only ? bench.tools.filter((t) => t.id === "agentty" || only.includes(t.id)) : bench.tools;
  const nameW = Math.max(...tools.map((t) => vw(t.name))) + 3;
  const out: Line[] = [];
  for (const m of METRICS.filter((x) => metrics.includes(x.key))) {
    const rows = [...tools].sort((a, b) => m.v(a) - m.v(b));
    const max = Math.max(...rows.map(m.v));
    const base = m.v(us);
    const labelW = Math.max(...rows.map((t) => vw(m.fmt(m.v(t))))) + 1 + 6;
    const cells = width - nameW - labelW - 1;
    if (out.length) out.push(L());
    out.push(L(m.label + dim(" · lower is better")));
    for (const t of rows) {
      const v = m.v(t);
      const isUs = t.id === "agentty";
      const bar = barText(v / max, cells);
      const r = v / base;
      const x = !isUs && r >= 1.15 ? dim(` ${r >= 10 ? Math.round(r) : r.toFixed(1)}×`) : "";
      out.push(L(
        (isUs ? bold(pad(t.name, nameW)) : pad(t.name, nameW)) +
        (isUs ? accent(bar) : dim(bar)) + " " + (isUs ? bold(m.fmt(v)) : m.fmt(v)) + x,
      ));
    }
  }
  out.push(L(), L(dim(`median of 10 launches · same machine · fresh install, no login · ${bench.measured.slice(0, 10)}`)));
  return out;
}

function releaseLines(width = W): Line[] {
  const ps = release.platforms as ReadonlyArray<(typeof release.platforms)[number]>;
  if (!ps.length) return [];
  const lw = Math.max(...ps.map((p) => vw(p.label))) + 2;
  const nw = Math.max(...ps.map((p) => vw(p.name))) + 2;
  const tw = Math.min(width, lw + nw + 8 + 3 + 9);
  const out: Line[] = [L(dim("─".repeat(tw)))];
  out.push(L(dim(pad("platform", lw) + pad("binary", nw) + padStart("size", 8) + "   sha-256")));
  out.push(out[0]);
  for (const p of ps) {
    out.push(L(pad(p.label, lw) + pad(link(p.name, p.url), nw) + padStart(p.sizeMB, 8) + "   " + dim(p.sha256 ? p.sha256.slice(0, 8) + "…" : "—")));
  }
  out.push(out[0]);
  return out;
}

const directive: Directive = (name, arg) => {
  if (name === "bench") return benchLines(["ready", "rss", "disk"], arg ? arg.split(",") : undefined);
  if (name === "release-table") return releaseLines();
  return [];
};

const caps = captured as { version: string; outputs: Record<string, string> };
export const runCapture: RunCapture = (cmd) =>
  caps.outputs[cmd] !== undefined ? { output: caps.outputs[cmd], version: caps.version } : null;

const body = (src: string) => markdownLines(src, { directive, run: runCapture });

// ── markdown sources ────────────────────────────────────────────────────
function stripFront(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return { data, body: m[2] };
}
function readContent(dir: string, slug: string): { data: Record<string, string>; body: string } | null {
  const f = join(process.cwd(), "content", dir, `${slug}.md`);
  if (!existsSync(f)) return null;
  const { data, body } = stripFront(applyTokens(readFileSync(f, "utf8")));
  return { data, body: body.replace(/^\s*#\s+.*(?:\n|$)/, "") };
}

// ── pages ───────────────────────────────────────────────────────────────
function home(): string {
  const logo = wordmarkRows().filter((r) => r.trim()).map((r) => L(accent(r)));
  const facts: [string, string][] = [
    ["sandbox", "kernel-enforced by claybin; " + "`~/.ssh`, `~/.aws`, `.env` masked"],
    ["models", "switch live: ^P provider, ^/ model"],
    ["editors", "Zed and JetBrains over ACP; MCP both ways"],
    ["air-gap", "`agentty airgap user@host` over SSH"],
    ["memory", "threads, checkpoints, subagents, local retrieval"],
  ];
  const factLines = (k: string, v: string) => {
    const segs = markdownLines(v, {}, W - 10);
    return segs.map((l, i) => L((i === 0 ? dim(pad(k, 10)) : " ".repeat(10)) + l.text));
  };
  return page("/", [
    L(),
    ...logo,
    L(),
    L(bold("An agent harness for your terminal.")),
    L(dim(`Ready to type in ${Math.round(us.readyMs.median)} ms, ${Math.round(us.idleRssMB)} MB idle. One small binary, any model.`)),
    L(),
    L(dim(pad("install", 10)) + accent("$") + " " + bold(site.installOneLiner)),
    L(" ".repeat(10) + dim("Linux, macOS, Windows · x86_64 & aarch64 · same line updates it")),
    L(" ".repeat(10) + dim("windows  ") + site.installOneLinerWindows),
    L(),
    ...benchLines(["ready", "rss"]),
    L(),
    ...facts.flatMap(([k, v]) => factLines(k, v)),
    L(),
    L(dim("read on")),
    ...pageList([
      { href: "/docs/quick-start", title: "quick start" },
      { href: "/docs", title: "the manual, every page" },
      { href: "/benchmarks", title: "all the numbers" },
      { href: "/compare", title: "agentty vs the others" },
      { href: "/changelog", title: "what changed, release by release" },
      { href: "/blog", title: "notes from building it" },
    ]),
  ]);
}

function docPage(slug: string): string | null {
  const d = getDoc(slug);
  if (!d) return null;
  if (!slug) return docsIndex();
  const src = d.source.replace(/^# .*\n\n/, "");
  const rest = d.description && src.startsWith(d.description) ? src.slice(d.description.length) : src;
  const { prev, next } = getAdjacentDocs(d.href);
  return page(d.href, [...title(d.title, d.description, d.navSection.toLowerCase()), ...body(rest)], pager(prev, next));
}

function docsIndex(): string {
  const d = getDoc("")!;
  const src = d.source.replace(/^# .*\n\n/, "");
  const rest = d.description && src.startsWith(d.description) ? src.slice(d.description.length) : src;
  const nav = getDocsNav();
  const out: Line[] = [...title(d.title, d.description, "docs"), ...body(rest), L(), L()];
  for (const s of nav) {
    out.push(L(bold(s.title.toLowerCase()), dim("##")), L());
    out.push(...pageList(s.items.map((i) => ({ href: i.href.replace(/\/$/, ""), title: i.title }))));
    out.push(L());
  }
  return page("/docs", out);
}

function postPage(slug: string): string | null {
  const post = getAllPosts().find((p) => p.slug === slug);
  const c = readContent("blog", slug);
  if (!post || !c) return null;
  const all = getAllPosts();
  const i = all.findIndex((p) => p.slug === slug);
  const newer = all[i - 1], older = all[i + 1];
  const meta = `${post.date} · ${post.readingMinutes} min read`;
  return page(`/blog/${slug}`, [...title(post.title, undefined, meta), ...body(c.body)], pager(
    newer && { href: `/blog/${newer.slug}`, title: newer.title },
    older && { href: `/blog/${older.slug}`, title: older.title },
  ));
}

function blogIndex(): string {
  const posts = getAllPosts();
  const out: Line[] = [...title("Notes from building agentty.", "Release notes, performance deep dives, and design notes.", "blog")];
  for (const p of posts) {
    wrapText(p.title, W - 12, { b: true }).forEach((x, k) =>
      out.push(L((k ? " ".repeat(12) : dim(p.date + "  ")) + link(x, absUrl(`/blog/${p.slug}/`)))));
    out.push(L(" ".repeat(12) + curlCmd(`/blog/${p.slug}`)));
    out.push(L());
  }
  return page("/blog", out);
}

function seoPage(dir: string, base: string, list: SeoPage[], slug: string, kicker: (p: SeoPage) => string, label: string): string | null {
  const p = list.find((x) => x.slug === slug);
  const c = readContent(dir, slug);
  if (!p || !c) return null;
  const out: Line[] = [...title(p.title, undefined, kicker(p))];
  if (p.verdict) {
    wrap([{ t: `${label}: `, s: { b: true } }, { t: p.verdict, s: {} }], W).forEach((x) => out.push(L(x)));
    out.push(L());
  }
  out.push(...body(c.body));
  const others = list.filter((x) => x.slug !== slug).map((x) => ({ href: `${base}/${x.slug}`, title: x.competitor || x.title }));
  return page(`${base}/${slug}`, out, others.length ? [L(), L(dim("─".repeat(W))), L(dim("more")), ...pageList(others)] : []);
}

function seoIndex(base: string, list: SeoPage[], t: string, lead: string, kicker: string): string {
  const out: Line[] = [...title(t, lead, kicker)];
  for (const p of list) {
    out.push(L(link(bold(p.title), absUrl(`${base}/${p.slug}/`))));
    out.push(L(curlCmd(`${base}/${p.slug}`)));
    out.push(L());
  }
  return page(base, out);
}

function contentPage(slug: string): string | null {
  const p = getContentPages().find((x) => x.slug === slug);
  const c = readContent("pages", slug);
  if (!p || !c) return null;
  return page(`/${slug}`, [...title(p.title, p.description), ...body(c.body)]);
}

function benchmarksPage(): string {
  const date = bench.measured.slice(0, 10);
  const out: Line[] = [
    ...title("Agent harness benchmarks",
      "Measured, not claimed: launch time, idle memory, disk and startup of seven terminal agents on one machine.", `measured ${date}`),
    ...benchLines(["ready", "rss", "disk", "startup"]),
    L(), L(),
    L(bold("All numbers"), dim("##")), L(),
  ];
  const cols = ["tool", "ready", "memory", "disk", "--version"];
  const w = [13, 9, 9, 9, 10];
  const rule = L(dim("─".repeat(w.reduce((a, b) => a + b, 0) + 3 * 4)));
  out.push(rule, L(dim(cols.map((c, i) => (i ? padStart(c, w[i]) : pad(c, w[i]))).join("   "))), rule);
  for (const t of bench.tools) {
    const cells = [t.name, fmtMs(t.readyMs.median), `${Math.round(t.idleRssMB)} MB`, `${Math.round(t.diskMB)} MB`, fmtMs(t.startupMs.median)];
    const row = cells.map((c, i) => (i ? padStart(c, w[i]) : pad(c, w[i]))).join("   ");
    out.push(L(t.id === "agentty" ? bold(row) : row));
  }
  out.push(rule, L());
  const hangWrap = (label: string, text: string) =>
    wrapText(text, W - 10).forEach((x, k) => out.push(L((k ? " ".repeat(10) : dim(pad(label, 10))) + x)));
  hangWrap("versions", bench.tools.map((t) => `${t.name} ${t.version.replace(/^(agentty|aider|codex-cli|jcode)\s+/, "").replace(/\s*\(.*\)$/, "")}`).join(" · "));
  hangWrap("machine", `${bench.machine.cpu.replace(/\((R|TM)\)/g, "").replace(/ CPU/, "")} (${bench.machine.threads} threads), ${bench.machine.memGB} GB, ${bench.machine.os}`);
  out.push(L(), L(bold("Method"), dim("##")), L());
  out.push(...markdownLines([
    "- **Ready to type:** launch the UI in a real pseudo-terminal; time until its first prompt is fully on screen. 10 launches, after each tool's one-time setup.",
    "- **Idle memory:** resident memory of the whole process tree, 2 s after the prompt appears, background servers included.",
    "- **Disk:** everything the tool needs as installed by its official method, including the Node.js or Python runtime.",
    "- **Fairness:** a fresh, empty home per tool; no accounts or network; runs interleaved round-robin.",
    "- **Close results:** agentty and jcode launch within the same range; treat that as a tie.",
  ].join("\n")));
  out.push(L(), L(bold("On your machine"), dim("##")), L());
  out.push(L(accent("$") + " " + bold("curl -fsSL agentty.org/bench | sh")));
  out.push(L(dim("times --version and measures install size for every agent you have installed")));
  return page("/benchmarks", out);
}

function changelogPage(): string {
  const f = join(process.cwd(), "content", "changelog.md");
  let md = existsSync(f) ? readFileSync(f, "utf8") : "";
  md = md.replace(/^#\s+Changelog\s*\n/, "").replace(/^All notable changes[^\n]*\n/m, "")
    .replace(/^## \[Unreleased\]\s*\n(?=## )/m, "")
    .replace(/^## \[([^\]]+)\]\s*-\s*(\d{4}-\d\d-\d\d)\s*$/gm, "## v$1 · $2");
  const secs = md.split(/^(?=## v)/m).filter((s) => s.startsWith("## v"));
  const out: Line[] = [...title("Changelog", "Every agentty release: added, changed, and fixed.", "git log --oneline")];
  for (const sec of secs) {
    const h = sec.match(/^## v(\S+) · (\d{4}-\d\d-\d\d)/)!;
    const bullet = sec.match(/^[-*] (.+)$/m)?.[1] ?? "";
    const first = (bullet.match(/^\*\*(.+?)\*\*/)?.[1] ?? bullet).replace(/\*\*|`|\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[.:]$/, "");
    const left = accent(pad("v" + h[1], 9)) + dim(pad(h[2], 12));
    const room = W - 21;
    out.push(L(left + (vw(first) > room ? first.slice(0, room - 1) + "…" : first)));
  }
  out.push(L(), L(dim("latest release in full")), L());
  if (secs[0]) out.push(...body(secs[0]));
  return page("/changelog", out);
}

function helpPage(): string {
  const out: Line[] = [
    ...title("agentty.org in your terminal", "Every page of the site, rendered for an 80-column terminal. Pipe it to less -R to page through.", "help"),
    L(bold("Try"), dim("##")), L(),
    L(accent("$") + " curl agentty.org"),
    L(accent("$") + " curl agentty.org/docs/sandboxing"),
    L(accent("$") + " curl -s agentty.org/docs/cli | less -R"),
    L(accent("$") + " curl -fsSL agentty.org/bench | sh"),
    L(), L(bold("Sections"), dim("##")), L(),
    ...pageList([
      { href: "/docs", title: "the manual" },
      { href: "/benchmarks", title: "measured numbers" },
      { href: "/compare", title: "comparisons" },
      { href: "/alternatives", title: "alternatives" },
      { href: "/guides", title: "guides" },
      { href: "/blog", title: "blog" },
      { href: "/changelog", title: "changelog" },
    ]),
    L(), L(bold("Notes"), dim("##")), L(),
    ...markdownLines([
      "- Colours are your terminal's own, so pages follow your theme, light or dark.",
      "- Links are clickable in terminals that support OSC 8 hyperlinks.",
      "- Raw markdown of any docs page: `curl agentty.org/md/<page>.md`.",
    ].join("\n")),
  ];
  return page("/help", out);
}

export function notFoundPage(): string {
  return frame([
    ...header("/404"), L(),
    L(accent("$") + " curl agentty.org/…"),
    L("curl: agentty.org has no such page in the terminal edition"),
    L(), L(dim("try")),
    ...pageList([
      { href: "", title: "home" },
      { href: "/docs", title: "every docs page" },
      { href: "/help", title: "what works in a terminal" },
    ]),
    ...footer("/"),
  ]);
}

// ── routing ─────────────────────────────────────────────────────────────
/** Every path the terminal edition renders (no leading/trailing slash; "" = home). */
export function termPaths(): string[] {
  return [
    "", "docs", "blog", "compare", "alternatives", "guides", "benchmarks", "changelog", "help", "404",
    ...getAllDocs().filter((d) => d.slug).map((d) => `docs/${d.slug}`),
    ...getAllPosts().map((p) => `blog/${p.slug}`),
    ...getComparePages().map((p) => `compare/${p.slug}`),
    ...getAlternativePages().map((p) => `alternatives/${p.slug}`),
    ...getGuidePages().map((p) => `guides/${p.slug}`),
    ...getContentPages().map((p) => p.slug),
  ];
}

export function renderTerm(path: string): string | null {
  const [a, b] = path.split("/");
  if (path === "") return home();
  if (path === "404") return notFoundPage();
  if (path === "help") return helpPage();
  if (path === "benchmarks") return benchmarksPage();
  if (path === "changelog") return changelogPage();
  if (path === "docs") return docsIndex();
  if (path === "blog") return blogIndex();
  if (a === "docs" && b) return docPage(b);
  if (a === "blog" && b) return postPage(b);
  if (path === "compare") return seoIndex("/compare", getComparePages(), "agentty vs other coding agents", "Honest, side-by-side comparisons, including when to choose the other tool.", "comparisons");
  if (path === "alternatives") return seoIndex("/alternatives", getAlternativePages(), "Open-source coding agent alternatives", "How agentty compares as an alternative to the popular coding agents.", "alternatives");
  if (path === "guides") return seoIndex("/guides", getGuidePages(), "agentty guides", "Practical, copy-pasteable walkthroughs.", "guides");
  if (a === "compare" && b) return seoPage("compare", "/compare", getComparePages(), b, (p) => `agentty vs ${p.competitor}`, "Short answer");
  if (a === "alternatives" && b) return seoPage("alternatives", "/alternatives", getAlternativePages(), b, (p) => `${p.competitor} alternative`, "In short");
  if (a === "guides" && b) return seoPage("guides", "/guides", getGuidePages(), b, () => "guide", "In short");
  if (!b) return contentPage(a);
  return null;
}
