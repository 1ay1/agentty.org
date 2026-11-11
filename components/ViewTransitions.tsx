"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// Page changes cross-fade instead of cutting, the nav and sidebar holding
// still. Next's <Link> navigates client-side without telling the browser, so
// the View Transitions API never sees it; this intercepts a plain left click
// on a same-site page link (capture phase, before <Link>'s own handler),
// starts a transition, and finishes it when the new route has rendered.
// Anything else (modified clicks, new tabs, files, same-page anchors,
// browsers without the API, reduced motion) is left exactly as it was.
export function ViewTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef<(() => void) | null>(null);

  useEffect(() => {
    done.current?.();
    done.current = null;
  }, [pathname]);

  // Links inside rendered markdown are plain <a>, which Next never prefetches.
  // Hovering (or focusing) one fetches its route, so the click is instant.
  useEffect(() => {
    const seen = new Set<string>();
    const warm = (e: Event) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !url.pathname.endsWith("/") || seen.has(url.pathname)) return;
      seen.add(url.pathname);
      router.prefetch(url.pathname);
    };
    document.addEventListener("pointerover", warm, { passive: true });
    document.addEventListener("focusin", warm);
    return () => { document.removeEventListener("pointerover", warm); document.removeEventListener("focusin", warm); };
  }, [router]);

  useEffect(() => {
    if (typeof document.startViewTransition !== "function") return;
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const onClick = (e: MouseEvent) => {
      if (still.matches || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      if (!url.pathname.endsWith("/")) return;              // a file (/md/x.md, feed.xml), not a page
      e.preventDefault();
      const href = url.pathname + url.search + url.hash;
      document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            done.current = resolve;
            window.setTimeout(resolve, 600);             // never hold the old frame longer than this
            router.push(href);
          }),
      );
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return null;
}
