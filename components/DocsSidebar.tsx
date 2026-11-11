"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { docsNav } from "@/lib/site";

export function DocsSidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const norm = (p: string) => (p.endsWith("/") ? p.slice(0, -1) : p) || "/";
  const current = norm(path);
  const currentTitle =
    docsNav.flatMap((s) => s.items).find((i) => norm(i.href) === current)?.title ?? "Documentation";

  // close the phone menu on navigation. The desktop sidebar never moves under
  // the reader: it scrolls only when the active page would be out of sight
  // (arriving from search, a link, or a fresh load), never after a click in it
  useEffect(() => {
    setOpen(false);
    const a = asideRef.current?.querySelector<HTMLElement>("a.active");
    const box = asideRef.current;
    if (!a || !box || box.scrollHeight <= box.clientHeight) return;
    const top = a.offsetTop, bottom = top + a.offsetHeight;
    if (top >= box.scrollTop && bottom <= box.scrollTop + box.clientHeight) return;
    box.scrollTop = Math.max(0, top - box.clientHeight / 3);
  }, [current]);

  return (
    <>
      <button
        className="docs-side-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="docs-nav"
      >
        <span>{currentTitle}</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <aside ref={asideRef} id="docs-nav" className={`docs-side ${open ? "open" : ""}`} aria-label="Documentation">
        {docsNav.map((sec) => (
          <nav className="sec" key={sec.title} aria-label={sec.title}>
            <p className="sec-title">{sec.title}</p>
            {sec.items.map((it) => {
              const on = current === norm(it.href);
              return (
                <Link key={it.href} href={it.href} className={on ? "active" : ""} aria-current={on ? "page" : undefined}>
                  {it.title}
                </Link>
              );
            })}
          </nav>
        ))}
      </aside>
    </>
  );
}
