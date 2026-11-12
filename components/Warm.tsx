"use client";

import { useEffect } from "react";

// Search (/) and the theme picker (t) open instantly because their code is in
// the page bundle and their data is already in memory when you reach for it:
//   - the data (the search index, the 615 schemes; ~90 KB gzipped together)
//     is fetched and parsed while idle on a desktop; on a touch device or a
//     data-saver connection, only on intent: touching the menu, search or
//     theme controls, or hovering them
export function Warm() {
  useEffect(() => {
    let palette: Promise<{ warmIndex: () => void }> | null = null;
    let themes: Promise<{ loadThemes: () => Promise<unknown> }> | null = null;
    const code = () => {
      palette ??= import("./CommandPalette");
      themes ??= import("./ThemePicker");
    };
    const data = () => {
      code();
      void palette!.then((m) => m.warmIndex());
      void themes!.then((m) => m.loadThemes());
    };
    const idle = (f: () => void) =>
      ((window as any).requestIdleCallback ? (window as any).requestIdleCallback(f, { timeout: 4000 }) : setTimeout(f, 1500));
    const conn = (navigator as any).connection;
    const frugal = matchMedia("(hover: none)").matches || conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType || "");
    const start = () => idle(() => { code(); if (!frugal) idle(data); });
    if (document.readyState === "complete") start(); else addEventListener("load", start, { once: true });

    const intent = (e: Event) => {
      const t = e.target as Element | null;
      if (t?.closest?.(".cmdk-trigger, .nav-theme, .nav-toggle, .mobile-util, .sl-theme")) data();
    };
    document.addEventListener("pointerover", intent, { passive: true });
    document.addEventListener("pointerdown", intent, { passive: true });
    document.addEventListener("focusin", intent);
    return () => {
      document.removeEventListener("pointerover", intent);
      document.removeEventListener("pointerdown", intent);
      document.removeEventListener("focusin", intent);
    };
  }, []);
  return null;
}
