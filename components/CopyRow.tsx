"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

// How the command wraps on a narrow screen: a URL may break after a "/"
// (never inside a word, so no "install.s / h"), and "| sh" stays together.
// Display only: copy takes the plain string.
function show(cmd: string) {
  const cut = cmd.lastIndexOf(" | ");
  const head = cut < 0 ? cmd : cmd.slice(0, cut);
  const tail = cut < 0 ? "" : cmd.slice(cut + 1);
  const parts = head.split(/(?<=\/)/);
  return (
    <>
      {parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && <wbr />}</span>)}
      {tail && <> <span className="nobr">{tail}</span></>}
    </>
  );
}

/** A one-line shell command with a copy button. No effects: the command is
 *  the content. Long commands scroll horizontally inside the row. */
export function CopyRow({ cmd, prompt = "$" }: { cmd: string; prompt?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      return;
    }
    track("copy-install", { cmd });   // same event name analytics already counts
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="copyrow">
      <span className="copyrow-caret" aria-hidden="true">{prompt}</span>
      <code>{show(cmd)}</code>
      <button className="copybtn" onClick={copy} aria-label="Copy install command">
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
