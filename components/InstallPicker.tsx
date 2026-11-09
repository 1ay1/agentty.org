"use client";

import { useState } from "react";
import { CopyRow } from "@/components/CopyRow";
import { site } from "@/lib/site";

// The home page's install line. Linux and macOS share the shell one-liner (the
// default); Windows gets the PowerShell one. The platform names are links to
// their install docs, so without JavaScript they still go somewhere useful.
const PLATFORMS = [
  { id: "linux", label: "Linux", href: "/docs/installation/#one-line-install-recommended" },
  { id: "macos", label: "macOS", href: "/docs/installation/#macos" },
  { id: "windows", label: "Windows", href: "/docs/installation/#windows" },
] as const;
type Id = (typeof PLATFORMS)[number]["id"];

export function InstallPicker() {
  const [os, setOs] = useState<Id>("linux");
  const win = os === "windows";
  return (
    <>
      <CopyRow cmd={win ? site.installOneLinerWindows : site.installOneLiner} prompt={win ? ">" : "$"} />
      <span className="install-meta">
        {PLATFORMS.map((p, i) => {
          const current = win ? p.id === "windows" : p.id !== "windows";
          return (
            <span key={p.id}>
              {i > 0 && ", "}
              <a
                href={p.href}
                className={current ? "is-on" : undefined}
                aria-pressed={current}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                  e.preventDefault();
                  setOs(p.id);
                }}
              >
                {p.label}
              </a>
            </span>
          );
        })}
        {" · x86_64 & aarch64 · "}
        {win ? (
          <a href="/docs/installation/#windows">more ways on Windows</a>
        ) : (
          "same line updates it"
        )}
      </span>
    </>
  );
}
