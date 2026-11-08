"use client";

import { useEffect } from "react";

// One delegated click handler for everything interactive inside rendered
// markdown: code-block copy buttons and heading self-links (click copies the
// section URL as well as navigating). No per-element listeners, no DOM writes
// on load.
export function DocEnhance() {
  useEffect(() => {
    const flash = (el: HTMLElement, text: string, done: string) => {
      el.textContent = done;
      el.dataset.done = "";
      window.setTimeout(() => { el.textContent = text; delete el.dataset.done; }, 1400);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const copy = t?.closest<HTMLButtonElement>(".codeblock-copy");
      if (copy) {
        const code = copy.closest(".codeblock")?.querySelector("pre code")?.textContent ?? "";
        navigator.clipboard?.writeText(code.replace(/\n$/, "")).then(() => flash(copy, "copy", "copied"), () => {});
        return;
      }
      const a = t?.closest<HTMLAnchorElement>("a.anchor");
      if (a && !e.metaKey && !e.ctrlKey) {
        navigator.clipboard?.writeText(location.origin + location.pathname + a.getAttribute("href")).catch(() => {});
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
