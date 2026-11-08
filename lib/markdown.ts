// Tiny, dependency-free Markdown → HTML for the blog. Deliberately NOT remark/
// mdx: the site ships zero runtime deps and renders docs as hand-written JSX, so
// a blog post is just a Markdown string turned into a safe HTML string at build
// time. Supports the subset a changelog/announcement post actually needs:
// headings, paragraphs, fenced + inline code, bold/italic, links, images,
// ordered/unordered lists, blockquotes, hr, and tables. Output is sanitized by
// construction (we escape all text; we only emit a fixed tag set).

import { highlight } from "./highlight";

export type MdHeading = { id: string; text: string; level: number };

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Inline: code spans first (so their contents aren't further formatted), then
// images, links, bold, italic. Operates on already-escaped text.
function inline(text: string): string {
  // pull out `code` spans, replace with placeholders, restore at the end
  const codes: string[] = [];
  let out = text.replace(/`([^`]+)`/g, (_m, c) => {
    codes.push(`<code>${c}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  out = out
    // keyboard chips [[Ctrl+K]] -> <kbd>Ctrl+K</kbd>
    .replace(/\[\[([^\]]+)\]\]/g, (_m, k) => `<kbd>${k}</kbd>`)
    // images ![alt](src)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, src) => `<img src="${src}" alt="${alt}" loading="lazy" />`)
    // links [text](href)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, href) => {
      const ext = /^https?:\/\//.test(href);
      // external links get a ↗ marker (class "ext") unless the text already has one
      const rel = ext ? ` target="_blank" rel="noopener noreferrer"${/[\u2197]\s*$/.test(t) || /<code>/.test(t) ? "" : ' class="ext"'}` : "";
      return `<a href="${href}"${rel}>${t}</a>`;
    })
    // bold **x** / __x__
    .replace(/(\*\*|__)(?=\S)([\s\S]+?\S)\1/g, "<strong>$2</strong>")
    // italic *x* / _x_
    .replace(/(\*|_)(?=\S)([\s\S]+?\S)\1/g, "<em>$2</em>");

  // restore code spans
  out = out.replace(/\u0000(\d+)\u0000/g, (_m, i) => codes[Number(i)]);
  return out;
}

export function markdownToHtml(md: string): string {
  return renderMarkdown(md).html;
}

// slug for a heading: lowercase words joined by '-', markup stripped
const slugify = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-") || "section";

export function renderMarkdown(md: string, ids: Map<string, number> = new Map()): { html: string; headings: MdHeading[] } {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  const headings: MdHeading[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    if (buf.length) html.push(`<p>${inline(esc(buf.join(" ").trim()))}</p>`);
    buf.length = 0;
  };

  let para: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    // directive: a lone `:::release-table` (etc.) becomes a sentinel the page
    // hydrates into a live component. Kept out of the escaped text stream.
    const directive = line.match(/^:::(release-table)\s*$/);
    if (directive) {
      flushParagraph(para);
      html.push(`<div data-directive="${directive[1]}"></div>`);
      i++;
      continue;
    }

    // callout block:  :::note | :::tip | :::warn [optional label]
    //   ...body lines...
    // :::
    // Common aliases (GitHub / Docusaurus spellings) map onto the three styles.
    const callout = line.match(/^:::(note|tip|warn|warning|caution|danger|important|info|hint)\b\s*(.*)$/);
    if (callout && !/^:::(release-table)/.test(line)) {
      flushParagraph(para);
      const ALIAS: Record<string, [string, string]> = {
        warning: ["warn", "Warning"], caution: ["warn", "Caution"], danger: ["warn", "Danger"],
        important: ["note", "Important"], info: ["note", "Note"], hint: ["tip", "Tip"],
      };
      const [type, defaultLabel] = ALIAS[callout[1]] ?? [
        callout[1],
        callout[1] === "warn" ? "Warning" : callout[1] === "tip" ? "Tip" : "Note",
      ];
      const label = callout[2].trim() || defaultLabel;
      const inner: string[] = [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) {
        inner.push(lines[i]);
        i++;
      }
      i++; // closing :::
      const cls = type === "note" ? "note" : `note ${type}`;
      const body = renderMarkdown(inner.join("\n"), ids);
      html.push(
        `<aside class="${cls}" role="note"><span class="label">${esc(label)}</span>${body.html}</aside>`,
      );
      continue;
    }

    // fenced code block ```lang
    const fence = line.match(/^```([\w+#-]*)\s*$/);
    if (fence) {
      flushParagraph(para);
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // closing fence
      const { html: codeHtml, label } = highlight(code.join("\n"), fence[1]);
      html.push(
        `<div class="codeblock">` +
          `<div class="codeblock-head"><span>${esc(label)}</span>` +
          `<button type="button" class="codeblock-copy" aria-label="Copy code">copy</button></div>` +
          `<pre class="code"><code>${codeHtml}</code></pre></div>`,
      );
      continue;
    }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushParagraph(para);
      const level = h[1].length;
      const text = inline(esc(h[2].trim()));
      const base = slugify(h[2]);
      const n = ids.get(base) ?? 0;
      ids.set(base, n + 1);
      const id = n ? `${base}-${n}` : base;
      const plain = h[2].trim().replace(/`/g, "").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*|__/g, "");
      headings.push({ id, text: plain, level });
      html.push(
        level >= 2
          ? `<h${level} id="${id}">${text}<a class="anchor" href="#${id}" aria-label="Link to this section"></a></h${level}>`
          : `<h${level} id="${id}">${text}</h${level}>`,
      );
      i++;
      continue;
    }

    // horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushParagraph(para);
      html.push("<hr />");
      i++;
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      flushParagraph(para);
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html.push(`<blockquote>${inline(esc(quote.join(" ")))}</blockquote>`);
      continue;
    }

    // table: header row | --- | rows
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      flushParagraph(para);
      // Split on `|` but not inside `code` spans and not on escaped `\|`.
      const cells = (row: string) => {
        const inner = row.trim().replace(/^\||\|$/g, "");
        const out: string[] = [];
        let cur = "";
        let inCode = false;
        for (let k = 0; k < inner.length; k++) {
          const ch = inner[k];
          if (ch === "\\" && inner[k + 1] === "|") {
            cur += "|";
            k++;
            continue;
          }
          if (ch === "`") inCode = !inCode;
          if (ch === "|" && !inCode) {
            out.push(cur.trim());
            cur = "";
            continue;
          }
          cur += ch;
        }
        out.push(cur.trim());
        return out;
      };
      const head = cells(line);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(cells(lines[i]));
        i++;
      }
      const thead = `<thead><tr>${head.map((c) => `<th>${inline(esc(c))}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${inline(esc(c))}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;
      html.push(`<div class="tablewrap"><table>${thead}${tbody}</table></div>`);
      continue;
    }

    // lists (ordered / unordered), allowing nested via 2-space indent
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      flushParagraph(para);
      const ordered = /^\s*\d+\.\s+/.test(line);
      const tag = ordered ? "ol" : "ul";
      const items: string[] = [];
      const itemRe = ordered ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-*+]\s+(.*)$/;
      const isItem = (l: string) => itemRe.test(l);
      const startsBlock = (l: string) =>
        l.trim() === "" ||
        /^```/.test(l) ||
        /^#{1,4}\s/.test(l) ||
        /^>\s?/.test(l) ||
        /^\s*\|.*\|\s*$/.test(l);
      while (i < lines.length && isItem(lines[i])) {
        const m = lines[i].match(itemRe)!;
        let text = m[1];
        i++;
        // Fold soft-wrapped continuation lines (non-blank, not a new item or
        // block start) into the current item so one bullet stays one <li>.
        while (i < lines.length && !isItem(lines[i]) && !startsBlock(lines[i])) {
          text += " " + lines[i].trim();
          i++;
        }
        items.push(`<li>${inline(esc(text.trim()))}</li>`);
      }
      html.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    // blank line ends a paragraph
    if (line.trim() === "") {
      flushParagraph(para);
      i++;
      continue;
    }

    // accumulate paragraph text
    para.push(line);
    i++;
  }
  flushParagraph(para);

  return { html: html.join("\n"), headings };
}
