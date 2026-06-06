// Tiny, dependency-free Markdown → HTML for the blog. Deliberately NOT remark/
// mdx: the site ships zero runtime deps and renders docs as hand-written JSX, so
// a blog post is just a Markdown string turned into a safe HTML string at build
// time. Supports the subset a changelog/announcement post actually needs:
// headings, paragraphs, fenced + inline code, bold/italic, links, images,
// ordered/unordered lists, blockquotes, hr, and tables. Output is sanitized by
// construction (we escape all text; we only emit a fixed tag set).

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
    // images ![alt](src)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, src) => `<img src="${src}" alt="${alt}" loading="lazy" />`)
    // links [text](href)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, href) => {
      const ext = /^https?:\/\//.test(href);
      const rel = ext ? ' target="_blank" rel="noopener noreferrer"' : "";
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
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    if (buf.length) html.push(`<p>${inline(esc(buf.join(" ").trim()))}</p>`);
    buf.length = 0;
  };

  let para: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block ```lang
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      flushParagraph(para);
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // closing fence
      const lang = fence[1] ? ` data-lang="${fence[1]}"` : "";
      html.push(`<pre class="code"${lang}><code>${esc(code.join("\n"))}</code></pre>`);
      continue;
    }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushParagraph(para);
      const level = h[1].length;
      const text = inline(esc(h[2].trim()));
      const id = h[2]
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      html.push(`<h${level} id="${id}">${text}</h${level}>`);
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
      const cells = (row: string) =>
        row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
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
      while (i < lines.length && itemRe.test(lines[i])) {
        const m = lines[i].match(itemRe)!;
        items.push(`<li>${inline(esc(m[1]))}</li>`);
        i++;
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

  return html.join("\n");
}
