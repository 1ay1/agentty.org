"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

export function CopyRow({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copyrow">
      <span className="prompt">$</span>
      <code>{cmd}</code>
      <button
        className="copybtn"
        onClick={() => {
          navigator.clipboard?.writeText(cmd);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
          track("copy-install", { cmd });
        }}
      >
        {copied ? "copied ✓" : "copy"}
      </button>
    </div>
  );
}
