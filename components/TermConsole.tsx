"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { site } from "@/lib/site";
import { stats } from "@/lib/stats";
import { repo, starLabel } from "@/lib/repo";

/**
 * An interactive terminal easter-egg — the nerdiest thing on the site, but
 * fully keyboard-driven with clean UX:
 *
 *   • Press the backtick / tilde key (`) anywhere OUTSIDE an input to summon it.
 *   • Type real commands (help, ls, cat, neofetch, whoami, sudo, theme, …).
 *   • ↑ / ↓ walks shell history, Tab completes, Ctrl-L / `clear` wipes it,
 *     `exit` or Esc closes. It NEVER traps focus you didn't ask for.
 *
 * Zero deps, no network, respects prefers-reduced-motion (skips the boot
 * type-out). Lives behind DeferredFX so it never touches first paint.
 */

type Line = { kind: "in" | "out" | "err" | "art"; text: string };

const PROMPT = "you@agentty";

const BANNER = [
  "  __ _  __ _  ___ _ __ | |_| |_ _   _ ",
  " / _` |/ _` |/ _ \\ '_ \\| __| __| | | |",
  "| (_| | (_| |  __/ | | | |_| |_| |_| |",
  " \\__,_|\\__, |\\___|_| |_|\\__|\\__|\\__, |",
  "       |___/                    |___/ ",
];

export function TermConsole() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const bootedRef = useRef(false);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const push = useCallback((...ls: Line[]) => {
    setLines((prev) => [...prev, ...ls]);
  }, []);

  const out = (text: string): Line => ({ kind: "out", text });
  const err = (text: string): Line => ({ kind: "err", text });
  const art = (text: string): Line => ({ kind: "art", text });

  // ---- command table --------------------------------------------------
  const commands = useMemo(() => {
    const list: Record<
      string,
      { desc: string; run: (args: string[]) => Line[] | void }
    > = {
      help: {
        desc: "list every command",
        run: () => {
          const names = Object.keys(list).sort();
          const rows = names.map(
            (n) => `  ${n.padEnd(11)} ${list[n].desc}`
          );
          return [out("available commands:"), ...rows.map(out)];
        },
      },
      neofetch: {
        desc: "system info, obviously",
        run: () => {
          const info = [
            `${PROMPT}`,
            "-----------",
            `OS       : agentty ${stats.version} (static, no libc drama)`,
            `Kernel   : C++26`,
            `Shell    : /bin/agentty`,
            `Binary   : ${stats.sizeMB} · statically linked`,
            `Coldstart: ${stats.coldStart} (--version)`,
            `Stars    : ${starLabel} ⭐`,
            `License  : ${site.license}`,
            `Uptime   : since you got here`,
          ];
          const logo = [
            "   ▄▄▄▄▄   ",
            "  █     █  ",
            "  █  ▄  █  ",
            "  █  █  █  ",
            "  ▀▀▀▀▀▀▀  ",
            "           ",
            "           ",
            "           ",
            "           ",
          ];
          const rows = info.map((row, i) => art(`${logo[i] ?? "           "}  ${row}`));
          return rows;
        },
      },
      whoami: {
        desc: "existential dread, resolved",
        run: () => [out("a person of exquisite taste in terminal software.")],
      },
      ls: {
        desc: "list the goods",
        run: () => [
          art("drwxr-xr-x  docs/          the manual, all of it"),
          art("drwxr-xr-x  blog/          words we wrote"),
          art("-rwxr-xr-x  agentty*       the one static binary"),
          art("-rw-r--r--  LICENSE        MIT, go wild"),
          art("-rw-r--r--  .secret        (you didn't see this)"),
        ],
      },
      cat: {
        desc: "cat a file (try: cat .secret)",
        run: (a) => {
          const f = a[0];
          if (!f) return [err("usage: cat <file>")];
          if (f === ".secret")
            return [out("the C++ compiles faster than your JS bundler installs.")];
          if (f === "LICENSE")
            return [out(`MIT © agentty contributors — do whatever you want, just keep the notice.`)];
          return [err(`cat: ${f}: No such file or directory`)];
        },
      },
      sudo: {
        desc: "escalate (results may vary)",
        run: (a) => {
          if (a.join(" ") === "make me a sandwich")
            return [out("Okay. 🥪  (sudo privileges: granted, briefly)")];
          return [
            err(`${PROMPT} is not in the sudoers file.`),
            err("This incident will be reported. (it won't, we don't track you.)"),
          ];
        },
      },
      echo: {
        desc: "echo … echo … echo",
        run: (a) => [out(a.join(" ") || "")],
      },
      curl: {
        desc: "install one-liner",
        run: () => [
          out("$ " + site.installOneLiner),
          out("  ▸ detecting platform … linux/macos · x86_64 & aarch64"),
          out("  ▸ one static binary, no Node / Python / Electron"),
          out("  ✓ run it. that's it."),
        ],
      },
      stars: {
        desc: "GitHub stargazers",
        run: () => [out(`★ ${repo.stars} stars · ${repo.forks} forks — thank you 💛`)],
      },
      matrix: {
        desc: "you know the one",
        run: () => {
          window.dispatchEvent(new CustomEvent("agentty:matrix"));
          setOpen(false);
          return [out("wake up…")];
        },
      },
      theme: {
        desc: "toggle light/dark",
        run: () => {
          const el = document.documentElement;
          const now = el.getAttribute("data-theme") === "light" ? "dark" : "light";
          el.setAttribute("data-theme", now);
          try {
            localStorage.setItem("theme", now);
          } catch {}
          return [out(`theme → ${now}`)];
        },
      },
      docs: {
        desc: "open the manual",
        run: () => {
          router.push("/docs");
          setOpen(false);
        },
      },
      github: {
        desc: "open the repo",
        run: () => {
          window.open(site.github, "_blank", "noopener,noreferrer");
          return [out("opening github…")];
        },
      },
      date: { desc: "what year is it", run: () => [out(new Date().toString())] },
      uname: {
        desc: "-a",
        run: () => [out(`agentty ${stats.version} C++26 x86_64/aarch64 GNU/blazing-fast`)],
      },
      banner: { desc: "show the ascii banner", run: () => BANNER.map(art) },
      clear: {
        desc: "wipe the screen",
        run: () => {
          setLines([]);
        },
      },
      exit: {
        desc: "close the console",
        run: () => setOpen(false),
      },
    };
    // aliases
    list["ll"] = list["ls"];
    list["quit"] = list["exit"];
    list["q"] = list["exit"];
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ---- run a line -----------------------------------------------------
  const runLine = useCallback(
    (raw: string) => {
      const line = raw.trim();
      push({ kind: "in", text: line });
      if (!line) return;
      setHistory((h) => [...h, line]);
      setHistIdx(-1);
      const [cmd, ...args] = line.split(/\s+/);
      const entry = commands[cmd.toLowerCase()];
      if (!entry) {
        push(err(`${cmd}: command not found — type 'help'`));
        return;
      }
      const result = entry.run(args);
      if (Array.isArray(result)) push(...result);
    },
    [commands, push]
  );

  // ---- global summon key ----------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      if (!open && (e.key === "`" || e.key === "~") && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest("[data-open-console]");
      if (el) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("agentty:console-open", onOpen as EventListener);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("agentty:console-open", onOpen as EventListener);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  // ---- boot sequence on first open ------------------------------------
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    if (bootedRef.current) return;
    bootedRef.current = true;
    const boot: Line[] = [
      ...BANNER.map(art),
      out(""),
      out(`agentty console · v${stats.version} · type 'help' — 'exit' to close`),
      out(""),
    ];
    if (reduced) {
      setLines(boot);
      return;
    }
    // gentle staggered type-in
    let i = 0;
    const id = window.setInterval(() => {
      const next = boot[i];
      i++;
      if (next) setLines((prev) => [...prev, next]);
      if (i >= boot.length) window.clearInterval(id);
    }, 55);
    return () => window.clearInterval(id);
  }, [open, reduced]);

  // ---- autoscroll -----------------------------------------------------
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  // ---- input handlers -------------------------------------------------
  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      runLine(value);
      setValue("");
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const idx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setValue(history[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx < 0) return;
      const idx = histIdx + 1;
      if (idx >= history.length) {
        setHistIdx(-1);
        setValue("");
      } else {
        setHistIdx(idx);
        setValue(history[idx]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const frag = value.trim().toLowerCase();
      if (!frag) return;
      const match = Object.keys(commands)
        .filter((c) => c.startsWith(frag))
        .sort();
      if (match.length === 1) setValue(match[0] + " ");
      else if (match.length > 1) push(out(match.join("  ")));
    }
  };

  if (!open) return null;

  return (
    <div
      className="term-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="term-win" role="dialog" aria-label="agentty console">
        <div className="term-bar">
          <span className="term-dot term-dot--r" />
          <span className="term-dot term-dot--y" />
          <span className="term-dot term-dot--g" />
          <span className="term-bar-title">— agentty — /bin/agentty —</span>
          <button
            className="term-x"
            aria-label="close console"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>
        <div className="term-body" ref={bodyRef} onClick={() => inputRef.current?.focus()}>
          {lines.map((l, i) => (
            <div key={i} className={`term-line term-${l?.kind ?? "out"}`}>
              {l?.kind === "in" ? (
                <>
                  <span className="term-prompt">{PROMPT}</span>
                  <span className="term-sep">:~$ </span>
                  {l.text}
                </>
              ) : (
                (l?.text ?? "") || "\u00a0"
              )}
            </div>
          ))}
          <div className="term-line term-input-row">
            <span className="term-prompt">{PROMPT}</span>
            <span className="term-sep">:~$ </span>
            <input
              ref={inputRef}
              className="term-input"
              value={value}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onInputKey}
              aria-label="console input"
            />
            <span className="term-caret" />
          </div>
        </div>
        <div className="term-foot">
          <span><kbd>↑↓</kbd> history</span>
          <span><kbd>tab</kbd> complete</span>
          <span><kbd>^L</kbd> clear</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
