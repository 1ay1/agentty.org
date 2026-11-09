"use client";

import { useEffect, useState } from "react";

// The page reports its own weight, the way the site reports agentty's: the
// compressed bytes this page is made of (document, styles, scripts, fonts —
// not prefetches of other pages), cached or not, and how many cookies it set. Measured in the
// browser after load, so it is this page, as you got it.
export function PageWeight() {
  const [text, setText] = useState("");
  useEffect(() => {
    const measure = () => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      // what this page is made of: not prefetches of other pages or searches
      const res = (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
        .filter((e) => e.initiatorType !== "fetch" && e.initiatorType !== "xmlhttprequest");
      const bytes = [nav, ...res].reduce((a, e) => a + (e ? e.encodedBodySize || e.transferSize || 0 : 0), 0);
      if (!bytes) return;
      const cookies = document.cookie ? document.cookie.split(";").length : 0;
      setText(`${Math.round(bytes / 1024)} KB · ${cookies} cookie${cookies === 1 ? "" : "s"}`);
    };
    if (document.readyState === "complete") setTimeout(measure, 300);
    else window.addEventListener("load", () => setTimeout(measure, 300), { once: true });
  }, []);
  if (!text) return null;
  return (
    <span className="page-weight" title="what this page loaded, compressed, measured by your browser">
      {text}
    </span>
  );
}
