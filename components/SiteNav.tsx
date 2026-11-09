"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site, topNav } from "@/lib/site";
import { versionLabel } from "@/lib/release";
import { ThemeToggle } from "@/components/ThemeToggle";
import { track } from "@/lib/analytics";

const MENU_ID = "mobile-menu";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  const openPalette = () => {
    window.dispatchEvent(new Event("agentty:open-palette"));
  };

  // Auto-close on route change so the drawer never lingers over a new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: lock body scroll, close on Escape, close on outside-click,
  // and return focus to the toggle when it closes. This is the standard
  // disclosure-menu contract every user expects on a phone.
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || toggleRef.current?.contains(t)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    // pointerdown (not click) so a tap outside dismisses immediately,
    // before it can activate anything underneath.
    document.addEventListener("pointerdown", onPointer);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <header className="nav" id="top">
      <div className="wrap nav-inner">
        <Link className="brand" href="/" aria-label="agentty home" onClick={close}>
          <span className="brand-mark" aria-hidden="true">▌</span>
          <span className="brand-name">agentty</span>
          <span className="brand-ver" aria-label={`version ${versionLabel}`}>{versionLabel}</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {topNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname === n.href ? "page" : undefined}
            >
              {n.title}
            </Link>
          ))}
        </nav>
        <span className="nav-spacer" />
        <div className="nav-cta">
          <button className="cmdk-trigger" aria-label="Search the docs" onClick={openPalette}>
            search <kbd>/</kbd>
          </button>
          <a
            href={site.discord}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("discord-click", { from: "nav" })}
          >
            discord
          </a>
          <a
            href={site.github}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("github-click", { from: "nav" })}
          >
            github
          </a>
          <ThemeToggle />
        </div>
        <button
          ref={toggleRef}
          className="nav-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={MENU_ID}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "close" : "menu"}
        </button>
      </div>

      {open && (
        <div className="mobile-menu" id={MENU_ID} ref={menuRef}>
          <nav className="mobile-menu-links" aria-label="Mobile">
            {topNav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname === n.href ? "page" : undefined}
                onClick={close}
              >
                {n.title}
              </Link>
            ))}
            <a href={site.discord} target="_blank" rel="noopener noreferrer" onClick={close}>
              Discord ↗
            </a>
            <a href={site.github} target="_blank" rel="noopener noreferrer" onClick={close}>
              GitHub ↗
            </a>
          </nav>

          {/* Utilities are hidden from the desktop nav on phones — surface them
              here so search + theme are always reachable, not just on desktop. */}
          <div className="mobile-menu-utils">
            <button
              type="button"
              className="mobile-util"
              onClick={() => {
                close();
                openPalette();
              }}
            >
              Search <kbd>/</kbd>
            </button>
            <div className="mobile-util mobile-util-theme">
              <span>Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
