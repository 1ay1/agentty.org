"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Heading = { id: string; text: string; level: number };

export function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");
  const activeRef = useRef<string>("");
  const pinUntilRef = useRef<number>(0);
  const pathname = usePathname();

  useEffect(() => {
    // Re-run on every client-side nav: the DocsLayout stays mounted, so without
    // a pathname dep the TOC would keep the FIRST page's headings forever (or
    // stay empty if you landed on /docs/). Reset active too so the previous
    // page's highlight doesn't flash on the new page.
    setActive("");
    activeRef.current = "";
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(".docs-main h2[id], .docs-main h3[id]")
    );
    setHeadings(
      nodes.map((n) => ({
        id: n.id,
        text: n.textContent ?? "",
        level: n.tagName === "H3" ? 3 : 2,
      }))
    );
    if (nodes.length === 0) return;

    // Offset the "reading line" below the sticky nav. We deliberately keep a
    // comfortable gap above the heading's `scroll-margin-top` (nav-h + 20) so
    // that right after a click-scroll the clicked heading reliably registers
    // as "above the line" — a tight threshold loses the race to sub-pixel
    // rounding and the previous heading wins ("selects one above" symptom).
    const navH =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--nav-h")
      ) || 64;
    const readLine = navH + 56;

    const setActiveId = (id: string) => {
      if (activeRef.current !== id) {
        activeRef.current = id;
        setActive(id);
      }
    };

    // Scroll-position based spy: the active heading is the LAST one whose top is
    // above the reading line. This is robust at the top (falls back to the first
    // heading) and at the bottom (explicitly pins the last heading once the page
    // is scrolled to its end) — the two edge cases a pure IntersectionObserver
    // band gets wrong.
    let ticking = false;
    const compute = () => {
      ticking = false;

      // While a click-driven smooth scroll is in flight, the spy must stay out
      // of the way — otherwise intermediate frames keep reassigning `active`
      // and (for headings near the bottom that can't reach the reading line)
      // the spy would permanently override the user's selection.
      if (pinUntilRef.current && performance.now() < pinUntilRef.current) return;

      const scrollY = window.scrollY;
      const viewportH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      // At (or within 2px of) the bottom, always highlight the last heading —
      // otherwise trailing headings that can't reach the reading line never
      // activate.
      if (scrollY + viewportH >= docH - 2) {
        setActiveId(nodes[nodes.length - 1].id);
        return;
      }

      let current = nodes[0].id;
      let found = false;
      for (const n of nodes) {
        if (n.getBoundingClientRect().top <= readLine) {
          current = n.id;
          found = true;
        } else {
          break;
        }
      }
      // Before the first heading crosses the line, keep the first item active
      // (so there's never a "nothing selected" flash at the top of the page).
      if (!found) current = nodes[0].id;
      setActiveId(current);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(compute);
      }
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  if (headings.length < 2) return <aside className="docs-toc" aria-hidden />;

  const onClick = (id: string) => {
    // Sync immediately on click so the highlight doesn't lag the smooth scroll,
    // and freeze the scroll-spy until the browser's smooth-scroll animation
    // ends. Without this, intermediate frames (or the bottom-edge branch on
    // short pages) reassign `active` and the clicked heading loses selection
    // to the one above / below it.
    setActive(id);
    activeRef.current = id;
    // Hard cap: 1.5s guarantees we unpin even if `scrollend` never fires
    // (older Safari, reduced-motion, instant jumps).
    pinUntilRef.current = performance.now() + 1500;
    const unpin = () => {
      pinUntilRef.current = 0;
      window.removeEventListener("scrollend", unpin);
    };
    if ("onscrollend" in window) {
      window.addEventListener("scrollend", unpin, { once: true });
    }
  };

  return (
    <aside className="docs-toc" aria-label="On this page">
      <p className="t">On this page</p>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          onClick={() => onClick(h.id)}
          aria-current={active === h.id ? "true" : undefined}
          className={`${active === h.id ? "active" : ""} ${h.level === 3 ? "sub" : ""}`}
        >
          {h.text}
        </a>
      ))}
    </aside>
  );
}
