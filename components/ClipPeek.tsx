"use client";

import { useEffect } from "react";
import { GLYPH_CSS, styleRule, type Screen } from "@/lib/replay";

/**
 * ClipPeek — hover (or focus, or tap) anything marked data-clip in the docs
 * and a small window plays that clip: a short recording of the real agentty
 * doing what the text describes (scripts/demo-clips.mjs). Clips load only
 * when asked for, follow the site theme, loop while you look, and stop the
 * moment you leave. One delegated listener; nothing runs until you hover.
 */

type Clip = { screen: Screen; prefix: string; names: string[] };

const cache = new Map<string, Promise<Clip>>();
let sheetSeq = 0;
let glyphsIn = false;

function addCss(css: string) {
  const el = document.createElement("style");
  el.textContent = css;
  document.head.append(el);
}

function load(id: string, theme: "dark" | "light"): Promise<Clip> {
  const key = `${id}-${theme}`;
  if (!cache.has(key)) {
    cache.set(key, fetch(`/clips/${id}${theme === "light" ? "-light" : ""}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((screen: Screen) => {
        if (!glyphsIn) { addCss(GLYPH_CSS); glyphsIn = true; }
        const prefix = `k${++sheetSeq}_`;
        addCss(screen.styles.map((st, n) => styleRule(n, st, prefix)).join(""));
        const names = screen.classes.map(([s, g]) => (g ? `${prefix}${s} g g${g}` : `${prefix}${s}`));
        return { screen, prefix, names };
      })
      .catch((e) => { cache.delete(key); throw e; }));
  }
  return cache.get(key)!;
}

const siteTheme = () => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function ClipPeek() {
  useEffect(() => {
    const pop = document.createElement("div");
    pop.className = "clip-peek";
    pop.setAttribute("role", "tooltip");
    pop.hidden = true;
    pop.innerHTML =
      `<div class="clip-peek-head"><span class="clip-peek-mark">▌</span> agentty <span class="clip-peek-title"></span></div>` +
      `<div class="replay clip-peek-term"><div class="replay-screen"><div class="replay-grid"></div></div></div>`;
    document.body.append(pop);
    const grid = pop.querySelector<HTMLDivElement>(".replay-grid")!;
    const titleEl = pop.querySelector<HTMLSpanElement>(".clip-peek-title")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let current: HTMLElement | null = null;
    let showTimer = 0, hideTimer = 0, raf = 0, token = 0, shownAt = 0;

    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

    // the clip's screen: its last `rows` lines, every frame up to `upto`
    const draw = (clip: Clip, rows: (string | undefined)[]) => {
      const s = clip.screen;
      const top = Math.max(0, rows.length - s.rows);
      let html = "";
      for (let y = top; y < top + s.rows; y++) html += `<div>${rows[y] ?? ""}</div>`;
      grid.innerHTML = html;
    };
    const rowHtml = (clip: Clip, segs: [number, number, string, number][]) =>
      segs.map(([c, w, t, ci]) =>
        `<span class="${clip.names[ci]}" style="left:${(c * 0.6).toFixed(1)}em;width:${(w * 0.6).toFixed(1)}em">${esc(t)}</span>`).join("");

    const play = (clip: Clip, my: number) => {
      const s = clip.screen;
      grid.style.setProperty("--cols", String(s.cols));
      grid.style.setProperty("--rows", String(s.rows));
      grid.style.color = s.fg ?? "";
      grid.style.background = s.bg ?? "";
      const due = new Float64Array(s.frames.length);
      for (let n = 1, acc = 0; n < s.frames.length; n++) due[n] = acc += s.frames[n][0];
      const end = (due[s.frames.length - 1] * 1000) / s.fps;
      let rows: (string | undefined)[] = [];
      let i = 0, t0 = performance.now();
      const apply = (n: number) => { for (const [y, segs] of s.frames[n][1]) rows[y] = rowHtml(clip, segs); };
      if (reduce) { for (let n = 0; n < s.frames.length; n++) apply(n); draw(clip, rows); return; }
      const loop = (now: number) => {
        if (my !== token) return;
        const el = now - t0;
        if (el > end + 1800) { rows = []; i = 0; t0 = now; }     // hold the last frame, then loop
        const tick = (Math.min(el, end) * s.fps) / 1000;
        let changed = false;
        while (i < s.frames.length && due[i] <= tick) { apply(i++); changed = true; }
        if (changed) draw(clip, rows);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };

    const place = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const w = Math.min(560, innerWidth - 16);
      pop.style.width = `${w}px`;
      const h = pop.offsetHeight || w * 0.62;
      const left = Math.max(8, Math.min(r.left, innerWidth - w - 8));
      const below = r.bottom + 8 + h <= innerHeight || r.top - 8 - h < 0;
      pop.style.left = `${left}px`;
      pop.style.top = `${below ? r.bottom + 8 : r.top - 8 - h}px`;
    };

    const show = (el: HTMLElement) => {
      const id = el.dataset.clip;
      if (!id) return;
      clearTimeout(hideTimer);
      if (current === el && !pop.hidden) return;
      current = el;
      shownAt = performance.now();
      const my = ++token;
      stop();
      titleEl.textContent = el.tagName === "KBD" ? `· ${el.textContent}` : "";
      grid.innerHTML = "";
      pop.hidden = false;
      pop.dataset.loading = "";
      place(el);
      load(id, siteTheme()).then((clip) => {
        if (my !== token) return;
        delete pop.dataset.loading;
        if (!titleEl.textContent) titleEl.textContent = "";
        play(clip, my);
        place(el);
      }, () => { if (my === token) hide(true); });
    };
    const hide = (now = false) => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      const go = () => { token++; stop(); pop.hidden = true; current = null; };
      if (now) go(); else hideTimer = window.setTimeout(go, 160);
    };

    const target = (e: Event) => (e.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-clip]") ?? null;
    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = target(e);
      if (el) { clearTimeout(showTimer); showTimer = window.setTimeout(() => show(el), 180); }
      else if (pop.contains(e.target as Node)) clearTimeout(hideTimer);
    };
    const onOut = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const to = e.relatedTarget as Node | null;
      if (target(e) || pop.contains(e.target as Node)) {
        if (to && (pop.contains(to) || (current && current.contains(to)))) return;
        clearTimeout(showTimer);
        hide();
      }
    };
    const onFocus = (e: FocusEvent) => { const el = target(e); if (el) show(el); };
    const onBlur = (e: FocusEvent) => { if (target(e)) hide(); };
    const onClick = (e: MouseEvent) => {
      const el = target(e);
      // a tap focuses (which opens it) and then clicks: only a later click closes
      if (el) { e.preventDefault(); if (current === el && !pop.hidden && performance.now() - shownAt > 500) hide(true); else show(el); }
      else if (!pop.contains(e.target as Node) && !pop.hidden) hide(true);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !pop.hidden) hide(true); };
    const onScroll = () => { if (current && !pop.hidden) place(current); };
    const mo = new MutationObserver(() => { if (current && !pop.hidden) { const el = current; current = null; show(el); } });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      hide(true);
      mo.disconnect();
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      pop.remove();
    };
  }, []);
  return null;
}
