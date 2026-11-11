"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { currentScheme } from "@/lib/scheme";

// A mode line along the bottom of the window, the way vim, tmux and agentty
// itself have one: which file you are reading, which section you are in, how
// far down you are (Top / 42% / Bot), the colour scheme, and where the keys
// are. Messages from the keys (`y` copied the page) show here for a moment,
// like vim's message line. Desktop only: phones have no keys to advertise.
function fileOf(path: string) {
  const p = path.replace(/\/$/, "");
  if (!p) return "~/agentty.org";
  if (p === "/docs") return "docs/index.md";
  const m = p.match(/^\/(docs|blog|guides|compare|alternatives)\/(.+)$/);
  if (m) return `${m[1]}/${m[2]}.md`;
  return p.slice(1) + "/";
}

export function StatusLine() {
  const path = usePathname();
  const [pos, setPos] = useState("Top");
  const [sec, setSec] = useState("");
  const [scheme, setScheme] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const read = () => setScheme(currentScheme() || (document.documentElement.getAttribute("data-theme") === "light" ? "agentty light" : "agentty dark"));
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });
    window.addEventListener("agentty:scheme", read);
    return () => { mo.disconnect(); window.removeEventListener("agentty:scheme", read); };
  }, []);

  useEffect(() => {
    let t = 0;
    const onFlash = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      window.clearTimeout(t);
      t = window.setTimeout(() => setMsg(""), 2200);
    };
    window.addEventListener("agentty:flash", onFlash);
    return () => { window.removeEventListener("agentty:flash", onFlash); window.clearTimeout(t); };
  }, []);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const d = document.documentElement;
      const max = d.scrollHeight - innerHeight;
      const y = scrollY;
      setPos(max <= 4 ? "All" : y <= 2 ? "Top" : y >= max - 2 ? "Bot" : `${Math.round((y / max) * 100)}%`);
      const navH = parseFloat(getComputedStyle(d).getPropertyValue("--nav-h")) || 52;
      let cur = "";
      for (const h of document.querySelectorAll<HTMLElement>(":is(.doc-body, .page) h2[id]")) {
        if (h.getBoundingClientRect().top - navH - 24 > 0) break;
        cur = (h.textContent || "").replace(/#$/, "").trim();
      }
      setSec(cur);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    const ro = new ResizeObserver(on);
    ro.observe(document.body);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [path]);

  return (
    <div className="statusline" aria-hidden="true">
      <span className="sl-file">{fileOf(path)}</span>
      {msg ? <span className="sl-msg">{msg}</span> : sec && <span className="sl-sec">§ {sec}</span>}
      <span className="sl-fill" />
      <button type="button" tabIndex={-1} className="sl-theme" onClick={() => window.dispatchEvent(new Event("agentty:open-theme"))}>{scheme}</button>
      <span className="sl-pos">{pos}</span>
      <button type="button" tabIndex={-1} className="sl-keys" onClick={() => window.dispatchEvent(new Event("agentty:open-keys"))}><kbd>?</kbd> keys</button>
    </div>
  );
}
