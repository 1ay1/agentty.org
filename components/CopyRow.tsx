"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

/** A one-line shell command with a copy button. No effects: the command is
 *  the content. Long commands scroll horizontally inside the row. */
export function CopyRow({ cmd }: { cmd: string }) {
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
      <code>
        <span className="copyrow-caret" aria-hidden="true">$ </span>
        {cmd}
      </code>
      <button className="copybtn" onClick={copy} aria-label="Copy install command">
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
