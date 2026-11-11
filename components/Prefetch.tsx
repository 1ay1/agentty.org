"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Page changes are instant and still: the new page replaces the old in one
// frame, the nav and sidebar never move (no cross-fade, no slide; a terminal
// redraws, it doesn't animate). What makes that feel immediate is having the
// page before the click: Next prefetches <Link>s in view (a few KB each, not
// the whole HTML), and this covers the links Next never sees: plain <a>s inside rendered markdown. Hover or focus one and its route
// is fetched; by the click it is already here.
export function Prefetch() {
  const router = useRouter();
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
    // touch: the finger lands before the click; start the fetch there
    document.addEventListener("touchstart", warm, { passive: true });
    return () => {
      document.removeEventListener("pointerover", warm);
      document.removeEventListener("focusin", warm);
      document.removeEventListener("touchstart", warm);
    };
  }, [router]);
  return null;
}
