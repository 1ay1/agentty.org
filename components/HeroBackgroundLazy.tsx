"use client";

/**
 * A quiet, static hero backdrop: a faint blueprint grid + a single soft brand
 * glow, both pure CSS. No animated <canvas> digital rain — professional
 * dev-tool sites keep the background still so the content leads. This also
 * removes the heaviest decorative client component entirely (better LCP, zero
 * main-thread animation cost).
 */
export function HeroBackgroundLazy() {
  return (
    <div className="hero-bg" aria-hidden>
      <div className="hero-bg-grid" />
      <div className="hero-bg-glow" />
    </div>
  );
}
