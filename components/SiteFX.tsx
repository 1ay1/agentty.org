"use client";

import { useEffect } from "react";

/**
 * Site-wide flourishes, all opt-out under prefers-reduced-motion:
 *  - scroll progress bar (top gradient fill)
 *  - scroll-reveal for [data-reveal] elements (staggered fade + rise)
 *  - magnetic pull on [data-magnetic] (buttons lean toward the cursor)
 *  - konami code → logo-rain easter egg
 *
 * Pure DOM + rAF; no React re-renders, so it stays buttery.
 */
export function SiteFX() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── scroll progress bar ──
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    document.body.appendChild(bar);
    let rafP = 0;
    const onScroll = () => {
      if (rafP) return;
      rafP = requestAnimationFrame(() => {
        rafP = 0;
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        const p = max > 0 ? h.scrollTop / max : 0;
        bar.style.transform = `scaleX(${p.toFixed(4)})`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // ── scroll reveal ──
    let io: IntersectionObserver | null = null;
    let sweepTimer = 0;
    let onPageShow: ((e: PageTransitionEvent) => void) | null = null;
    const revealEls = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (reduce) {
      // reduced-motion: leave everything visible (CSS default), do nothing.
    } else {
      revealEls.forEach((el, i) => {
        // stagger siblings sharing a parent group
        const delay = el.dataset.revealDelay ?? `${(i % 6) * 60}ms`;
        el.style.setProperty("--reveal-delay", delay);
      });
      // Arm the hide-then-reveal styling ONLY now that JS is running and we're
      // about to observe. Until this class lands, [data-reveal] is fully
      // visible (see globals.css), so content never depends on this bundle.
      document.documentElement.classList.add("fx-ready");
      // Immediately reveal anything already in or above the viewport — covers
      // the case where SiteFX mounts late (deferred to idle) after the user
      // has already scrolled past a section.
      const vh = window.innerHeight || document.documentElement.clientHeight;
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("revealed");
              io?.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
      );
      revealEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.92) {
          // already visible at mount time → reveal without waiting for the IO
          el.classList.add("revealed");
        } else {
          io!.observe(el);
        }
      });

      // Safety net: an element that is actually within the viewport must never
      // stay hidden. The IntersectionObserver can miss it when layout shifts
      // after mount (late fonts/hero image make the initial rect stale), when
      // SiteFX mounts on a bfcache restore, or when the `-8%` rootMargin trims
      // an element the user never scrolls past. Sweep any still-unrevealed
      // [data-reveal] that overlaps the viewport and reveal it directly. This
      // mirrors the CountUp fallback: the normal scroll animation still wins
      // for anything genuinely below the fold.
      const sweep = () => {
        const h = window.innerHeight || document.documentElement.clientHeight;
        revealEls.forEach((el) => {
          if (el.classList.contains("revealed")) return;
          const r = el.getBoundingClientRect();
          if (r.top < h && r.bottom > 0) {
            el.classList.add("revealed");
            io?.unobserve(el);
          }
        });
      };
      // Run once after layout settles, and again on bfcache restore.
      sweepTimer = window.setTimeout(sweep, 400);
      onPageShow = (e: PageTransitionEvent) => {
        if (e.persisted) sweep();
      };
      window.addEventListener("pageshow", onPageShow);
    }

    // ── magnetic buttons ──
    const magnets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-magnetic]"),
    );
    const magCleanups: (() => void)[] = [];
    if (!reduce && window.matchMedia("(pointer: fine)").matches) {
      magnets.forEach((el) => {
        let raf = 0;
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const mx = e.clientX - (r.left + r.width / 2);
          const my = e.clientY - (r.top + r.height / 2);
          if (raf) return;
          raf = requestAnimationFrame(() => {
            raf = 0;
            el.style.transform = `translate(${mx * 0.25}px, ${my * 0.35}px)`;
          });
        };
        const onLeave = () => {
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          el.style.transform = "";
        };
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        magCleanups.push(() => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        });
      });
    }

    // ── konami code → logo rain ──
    const seq = [
      "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
      "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
      "b", "a",
    ];
    let pos = 0;
    let raining = false;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = k === seq[pos] ? pos + 1 : k === seq[0] ? 1 : 0;
      if (pos === seq.length) {
        pos = 0;
        if (!raining) logoRain();
      }
    };
    const logoRain = () => {
      raining = true;
      const layer = document.createElement("div");
      layer.className = "logo-rain";
      document.body.appendChild(layer);
      const glyphs = ["▌", "✦", "❯", "agentty", "⚡", "▎"];
      const N = 70;
      for (let i = 0; i < N; i++) {
        const s = document.createElement("span");
        s.textContent = glyphs[(Math.random() * glyphs.length) | 0];
        s.style.left = `${Math.random() * 100}%`;
        s.style.animationDelay = `${Math.random() * 2.2}s`;
        s.style.animationDuration = `${2.6 + Math.random() * 2.4}s`;
        s.style.fontSize = `${12 + Math.random() * 22}px`;
        layer.appendChild(s);
      }
      setTimeout(() => {
        layer.classList.add("fade");
        setTimeout(() => {
          layer.remove();
          raining = false;
        }, 900);
      }, 5200);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      io?.disconnect();
      if (sweepTimer) window.clearTimeout(sweepTimer);
      if (onPageShow) window.removeEventListener("pageshow", onPageShow);
      document.documentElement.classList.remove("fx-ready");
      magCleanups.forEach((fn) => fn());
      bar.remove();
      if (rafP) cancelAnimationFrame(rafP);
    };
  }, []);

  return null;
}
