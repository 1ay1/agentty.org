"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// SiteFX (scroll progress, reveal-on-scroll, magnetic buttons, konami egg) is
// pure decoration. We mount it only once the browser goes idle after the page
// is interactive, so it never adds to TBT or competes with first input.
const SiteFX = dynamic(() => import("./SiteFX").then((m) => m.SiteFX), {
  ssr: false,
});

// The interactive terminal console (press `) is a pure easter-egg — also
// deferred to idle so it never touches first paint or input latency.
const TermConsole = dynamic(
  () => import("./TermConsole").then((m) => m.TermConsole),
  { ssr: false }
);

export function DeferredFX() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const start = () => setReady(true);
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(start, { timeout: 2000 });
    } else {
      const t = window.setTimeout(start, 1200);
      return () => window.clearTimeout(t);
    }
  }, []);

  return ready ? (
    <>
      <SiteFX />
      <TermConsole />
    </>
  ) : null;
}
