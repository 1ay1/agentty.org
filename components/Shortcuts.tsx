"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Keyboard shortcuts, the way a terminal program has them: `?` lists them,
// `g` then a letter jumps somewhere (vim/less style). `/` and Ctrl+K belong to
// the search palette and are only listed here.
const GOTO: Record<string, { href: string; label: string }> = {
  h: { href: "/", label: "home" },
  d: { href: "/docs/", label: "docs" },
  i: { href: "/docs/installation/", label: "install" },
  b: { href: "/blog/", label: "blog" },
  c: { href: "/changelog/", label: "changelog" },
  m: { href: "/benchmarks/", label: "benchmarks" },
};

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

export function Shortcuts() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let pendingG = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "?") { e.preventDefault(); setOpen((o) => !o); return; }
      if (pendingG && Date.now() - pendingG < 1200 && GOTO[e.key]) {
        e.preventDefault();
        pendingG = 0;
        setOpen(false);
        router.push(GOTO[e.key].href);
        return;
      }
      pendingG = e.key === "g" ? Date.now() : 0;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (!open) return null;
  return (
    <div className="keys-overlay" onClick={() => setOpen(false)}>
      <div className="keys" role="dialog" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
        <p className="keys-title">keyboard shortcuts</p>
        <dl>
          <dt><kbd>/</kbd></dt><dd>search</dd>
          <dt><kbd>ctrl k</kbd></dt><dd>search</dd>
          {Object.entries(GOTO).map(([k, v]) => (
            <Fragment key={k}>
              <dt><kbd>g {k}</kbd></dt><dd>{v.label}</dd>
            </Fragment>
          ))}
          <dt><kbd>?</kbd></dt><dd>this list</dd>
          <dt><kbd>esc</kbd></dt><dd>close</dd>
        </dl>
      </div>
    </div>
  );
}
