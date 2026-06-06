"use client";

import { useEffect, useState } from "react";

type Heading = { id: string; text: string; level: number };

export function BlogSidebar({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(".blog-body h2[id], .blog-body h3[id]"),
    );
    setHeadings(
      nodes.map((n) => ({
        id: n.id,
        text: n.textContent ?? "",
        level: n.tagName === "H3" ? 3 : 2,
      })),
    );

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 1] },
    );
    nodes.forEach((n) => obs.observe(n));

    // reading progress over the article body
    const body = document.querySelector<HTMLElement>(".blog-body");
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!body) return;
        const rect = body.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = rect.height - vh;
        const done = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
        setProgress(total > 0 ? Math.min(done / total, 1) : 0);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const share = (where: "x" | "hn" | "copy") => {
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title);
    if (where === "x") {
      window.open(`https://twitter.com/intent/tweet?text=${t}&url=${u}`, "_blank", "noopener");
    } else if (where === "hn") {
      window.open(`https://news.ycombinator.com/submitlink?u=${u}&t=${t}`, "_blank", "noopener");
    } else {
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <aside className="blog-rail" aria-label="Article navigation">
      <div className="blog-rail-sticky">
        <div className="blog-progress" aria-hidden>
          <svg viewBox="0 0 36 36" className="blog-progress-ring">
            <circle className="bg" cx="18" cy="18" r="15.5" />
            <circle
              className="fg"
              cx="18"
              cy="18"
              r="15.5"
              style={{ strokeDashoffset: 97.4 * (1 - progress) }}
            />
          </svg>
          <span className="blog-progress-pct">{Math.round(progress * 100)}%</span>
        </div>

        {headings.length >= 2 && (
          <nav className="blog-toc" aria-label="On this page">
            <p className="blog-toc-title">On this page</p>
            {headings.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                className={`${active === h.id ? "active" : ""} ${h.level === 3 ? "sub" : ""}`}
              >
                {h.text}
              </a>
            ))}
          </nav>
        )}

        <div className="blog-share">
          <p className="blog-toc-title">Share</p>
          <div className="blog-share-row">
            <button onClick={() => share("x")} aria-label="Share on X" title="Share on X">
              𝕏
            </button>
            <button onClick={() => share("hn")} aria-label="Share on Hacker News" title="Share on Hacker News">
              Y
            </button>
            <button onClick={() => share("copy")} aria-label="Copy link" title="Copy link">
              {copied ? "✓" : "⧉"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
