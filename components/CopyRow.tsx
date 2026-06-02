"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";

export function CopyRow({ cmd, typed = false }: { cmd: string; typed?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);
  const [shown, setShown] = useState(typed ? "" : cmd);
  const [caret, setCaret] = useState(typed);
  const rootRef = useRef<HTMLDivElement>(null);
  const ran = useRef(false);

  // type the command out, once, when it scrolls into view
  useEffect(() => {
    if (!typed) return;
    const el = rootRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(cmd);
      setCaret(false);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !ran.current) {
            ran.current = true;
            let i = 0;
            const step = () => {
              i++;
              setShown(cmd.slice(0, i));
              if (i < cmd.length) {
                window.setTimeout(step, 26 + Math.random() * 28);
              } else {
                window.setTimeout(() => setCaret(false), 700);
              }
            };
            window.setTimeout(step, 250);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    // Safety net: never leave the command blank if the typing observer doesn't
    // fire (deferred mount, IO edge cases) — settle to the full command.
    const fallback = window.setTimeout(() => {
      if (!ran.current) {
        ran.current = true;
        io.disconnect();
        setShown(cmd);
        setCaret(false);
      }
    }, 3500);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, [cmd, typed]);

  const copy = () => {
    navigator.clipboard?.writeText(cmd);
    setCopied(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 520);
    setTimeout(() => setCopied(false), 1400);
    track("copy-install", { cmd });
  };

  return (
    <div className={`copyrow ${flash ? "flash" : ""}`} ref={rootRef}>
      <span className="prompt">$</span>
      <code>
        {shown}
        {caret && <span className="copyrow-caret" />}
      </code>
      <button className="copybtn" onClick={copy}>
        {copied ? "copied ✓" : "copy"}
      </button>
    </div>
  );
}
