// agentty's colour schemes on the site. public/themes.json (scripts/gen-themes.mjs)
// carries each scheme's semantic slots exactly as agentty resolves them; this
// maps those slots onto the site's tokens the same way agentty's views use
// them: accent is the brand, info is structure (headings, paths), primary is
// names, secondary is commands, warning is settings, error is values.

export const SLOTS = ["background", "surface", "border", "text", "muted", "accent", "primary", "secondary", "info", "warning", "error", "highlight"] as const;
export type Scheme = { name: string } & Record<(typeof SLOTS)[number], string>;

export function parseThemes(json: { slots: string[]; themes: string[][] }): Scheme[] {
  return json.themes.map(([name, ...hex]) => {
    const s = { name } as Scheme;
    json.slots.forEach((k, i) => ((s as Record<string, string>)[k] = "#" + hex[i]));
    return s;
  });
}

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const isLight = (s: Scheme) => lum(s.background) > 0.4;
const mix = (a: string, b: string, p: number) => `color-mix(in srgb, ${a} ${p}%, ${b})`;

export function schemeCss(s: Scheme): string {
  const v: Record<string, string> = {
    "--bg": s.background,
    "--bg-soft": s.surface,
    "--bg-elev": mix(s.surface, s.text, 92),
    "--border": s.border,
    "--border-soft": mix(s.border, s.background, 55),
    "--text": s.text,
    "--text-dim": mix(s.text, s.background, 84),
    "--text-faint": mix(s.text, s.background, 58),
    "--accent": s.accent,
    "--accent-hover": mix(s.accent, s.text, 75),
    "--cyan": s.info,
    "--c-path": s.info, "--c-head": s.info, "--c-cmd": s.secondary, "--c-env": s.warning,
    "--c-sym": s.primary, "--c-val": mix(s.error, s.warning, 60),
    "--tip": s.secondary, "--warn": s.warning, "--on-accent": s.background,
    "--hl-foreground": s.text, "--hl-token-comment": mix(s.text, s.background, 50), "--hl-token-keyword": s.accent,
    "--hl-token-string": s.info, "--hl-token-string-expression": s.secondary, "--hl-token-function": s.primary,
    "--hl-token-constant": mix(s.error, s.warning, 60), "--hl-token-parameter": s.text,
    "--hl-token-punctuation": mix(s.text, s.background, 65), "--hl-token-link": s.primary,
  };
  return Object.entries(v).map(([k, x]) => `${k}:${x}`).join(";");
}

/** Paint a scheme (or the site's own dark/light when null) and remember it. */
export function applyScheme(s: Scheme | null, base?: "dark" | "light", persist = true) {
  const d = document.documentElement;
  const theme = s ? (isLight(s) ? "light" : "dark") : base ?? ((d.getAttribute("data-theme") as "dark" | "light") || "dark");
  const css = s ? schemeCss(s) : "";
  d.style.cssText = css;
  d.setAttribute("data-theme", theme);
  if (!persist) return;
  try {
    localStorage.setItem("theme", theme);
    if (s) { localStorage.setItem("scheme", s.name); localStorage.setItem("scheme-css", css); }
    else { localStorage.removeItem("scheme"); localStorage.removeItem("scheme-css"); }
  } catch {}
  window.dispatchEvent(new CustomEvent("agentty:scheme", { detail: s?.name ?? null }));
}

export const currentScheme = () => {
  try { return localStorage.getItem("scheme"); } catch { return null; }
};
