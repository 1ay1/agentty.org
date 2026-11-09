"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
    setTheme(current);
    setMounted(true);
  }, []);

  const toggle = () => {
    const now = (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
    const next: Theme = now === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };

  // Avoid hydration mismatch: render a neutral button until mounted.
  const isLight = mounted && theme === "light";

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Switch to dark theme" : "Switch to light theme"}
    >
      {/* names the theme you'd switch to; CSS shows the right word before hydration */}
      <span className="theme-icon sun">light</span>
      <span className="theme-icon moon">dark</span>
    </button>
  );
}
