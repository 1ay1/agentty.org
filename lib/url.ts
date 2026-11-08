// The site is exported with trailing slashes (/docs/quick-start/). Linking to
// the slash-less form costs every crawler and reader a 301 hop, so internal
// links are written in the canonical form at the source.
export function slash(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const i = href.search(/[?#]/);
  const path = i < 0 ? href : href.slice(0, i), rest = i < 0 ? "" : href.slice(i);
  if (path.endsWith("/") || /\.[a-z0-9]+$/i.test(path)) return href;
  return `${path}/${rest}`;
}
