// Search-result-friendly titles and descriptions, used by every page's
// metadata. Google shows ~60 characters of a title and ~155 of a description;
// anything longer is cut mid-word, anything much shorter wastes the slot.

/** Full <title>: page title + the most specific suffix that still fits ~60 chars. */
export function seoTitle(title: string, section?: string): { absolute: string } {
  let t = title.replace(/\s+/g, " ").trim();
  // too long for a result: drop a trailing "(2026)" then the subtitle after " — " / ": "
  if (t.length > 60) t = t.replace(/\s*\(\d{4}\)\s*$/, "");
  if (t.length > 60) {
    const head = t.split(/\s+[—–]\s+|:\s+/)[0];
    if (head.length >= 20 && head.length < t.length) t = head;
  }
  const options = [section ? `${t} · agentty ${section}` : "", `${t} · agentty`, t].filter(Boolean);
  const fits = options.find((o) => o.length <= 60) ?? t;
  // very short titles ("FAQ", "License") say what agentty is, too
  if (fits.length < 24) return { absolute: /agentty/i.test(t) ? `${t} — the terminal coding agent` : `${t} — agentty, the terminal coding agent` };
  // a title that already says "agentty" doesn't need the brand twice
  return { absolute: /agentty/i.test(t) && fits !== t && t.length <= 60 ? t : fits };
}

/** Meta description clamped to ~155 chars at a word boundary; short ones get context. */
export function seoDescription(desc: string, context = "agentty — a fast, sandboxed coding agent for your terminal: one small binary, any model."): string {
  let d = desc.replace(/\s+/g, " ").trim();
  if (d.length < 70) d = d ? `${d.replace(/\.?$/, ".")} ${context}` : context;
  if (d.length <= 158) return d;
  const cut = d.slice(0, 155);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:—–-]+$/, "") + "…";
}
