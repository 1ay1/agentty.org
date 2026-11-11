"use client";

import { useEffect, useRef, useState } from "react";

// Replays a time benchmark: when the chart scrolls into view, every bar grows
// from zero on one shared clock, so each tool's bar stops at its measured
// time. The clock runs at a fixed speed-up (the slowest tool lands in
// RACE_MS; real time made the reader wait five seconds), the SAME speed-up
// for every bar, so the race is still exactly proportional and the readout
// still counts the real measured milliseconds.
// The bars' widths are already proportional to their times, so a single
// clock means one speed for every bar: CSS does the drawing
// (animation-duration = the row's --ms / --race-k), and this component only
// arms it, runs the clock readout, and offers a replay. Without JS, or with
// reduced motion, the chart is the static one.
const RACE_MS = 1600;
export function BenchRace() {
  const ref = useRef<HTMLSpanElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const [runs, setRuns] = useState(0);

  useEffect(() => {
    const fig = ref.current?.closest<HTMLElement>("figure[data-race-ms]");
    if (!fig || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const real = Number(fig.dataset.raceMs);
    const k = Math.max(1, real / RACE_MS);            // measured ms per shown ms
    fig.style.setProperty("--race-k", String(k));
    let raf = 0, shown = -1;
    // the readout is one text node written directly, 20 times a second: no
    // React render per frame (that was most of a phone's CPU during the race)
    const show = (t: number) => {
      const c = clock.current;
      if (!c) return;
      const q = Math.floor(t / 50);
      if (q === shown) return;
      shown = q;
      c.hidden = false;
      c.textContent = t < 1000 ? `${Math.round(t)} ms` : `${(t / 1000).toFixed(2)} s`;
    };
    const run = () => {
      fig.dataset.race = "";                           // restart the CSS animations
      void fig.offsetWidth;
      fig.dataset.race = "on";
      const t0 = performance.now();
      const tick = (now: number) => {
        const e = (now - t0) * k;                      // in measured milliseconds
        show(Math.min(e, real));
        if (e < real + 100 * k) raf = requestAnimationFrame(tick);
        else { shown = -1; show(real); fig.dataset.race = "done"; }
      };
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    if (runs > 0) { run(); return () => cancelAnimationFrame(raf); }
    // first run: only once it is actually on screen
    fig.dataset.race = "armed";
    const io = new IntersectionObserver((es) => {
      if (es.some((x) => x.isIntersecting)) { io.disconnect(); run(); }
    }, { threshold: 0.6 });
    io.observe(fig);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [runs]);

  return (
    <span ref={ref} className="bench-race">
      <span ref={clock} className="bench-clock" hidden />
      <button type="button" onClick={() => setRuns((r) => r + 1)} aria-label="Replay the launch race in real time">
        ↻ replay
      </button>
    </span>
  );
}
