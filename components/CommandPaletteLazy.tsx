"use client";

import { useEffect, useState } from "react";
import { CommandPalette as Palette } from "./CommandPalette";

// The palette mounts the first time it's summoned. Its code is in the page
// bundle (2 KB: a lazy chunk cost a ~300 ms round of Suspense on first open)
// and its index is fetched ahead of time by <Warm/>, so the first / or ⌘K
// opens it in the same frame.

export function CommandPaletteLazy() {
  const [armed, setArmed] = useState(false);
  const [query, setQuery] = useState("");

  // ?q=… (the site's search URL, declared to search engines) opens search pre-filled
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q");
    if (q) { setQuery(q); setArmed(true); }
  }, []);

  useEffect(() => {
    if (armed) return;
    const arm = () => setArmed(true);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        arm();
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing) {
        e.preventDefault();
        arm();
      }
    };
    // Arm on the first ⌘K, or on the first user interaction with the trigger.
    window.addEventListener("keydown", onKey);
    window.addEventListener("agentty:open-palette", arm as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("agentty:open-palette", arm as EventListener);
    };
  }, [armed]);

  if (!armed) return null;
  // Once armed, the real palette mounts and immediately opens (it re-reads the
  // ⌘K listener itself). We pass a prop so it knows to start open.
  return <Palette startOpen initialQuery={query} />;
}
