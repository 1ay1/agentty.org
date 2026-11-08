"use client";

import { useState } from "react";

// "Copy page" (the page as Markdown, ready to paste into an LLM) and a link to
// the raw .md. The markdown is fetched only when asked for.
export function PageActions({ md }: { md: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      const text = await fetch(md).then((r) => (r.ok ? r.text() : Promise.reject()));
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1600);
  };
  return (
    <div className="page-actions">
      <button type="button" onClick={copy}>
        {state === "copied" ? "copied" : state === "failed" ? "copy failed" : "copy page"}
      </button>
      <a href={md}>view .md</a>
    </div>
  );
}
