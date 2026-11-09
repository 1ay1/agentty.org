// Build-time syntax highlighting for every fenced code block on the site.
// Runs only inside markdownToHtml (server components / static export), so it
// ships zero bytes of JS. Colours are CSS variables (--hl-*) defined in
// app/site.css for both themes, so one HTML output serves dark and light.
import { createHighlighterCoreSync, createCssVariablesTheme } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import shellscript from "@shikijs/langs/shellscript";
import json from "@shikijs/langs/json";
import jsonc from "@shikijs/langs/jsonc";
import yaml from "@shikijs/langs/yaml";
import toml from "@shikijs/langs/toml";
import ini from "@shikijs/langs/ini";
import python from "@shikijs/langs/python";
import cpp from "@shikijs/langs/cpp";
import cmake from "@shikijs/langs/cmake";
import markdown from "@shikijs/langs/markdown";
import diff from "@shikijs/langs/diff";
import typescript from "@shikijs/langs/typescript";
import javascript from "@shikijs/langs/javascript";
import powershell from "@shikijs/langs/powershell";

const theme = createCssVariablesTheme({
  name: "site",
  variablePrefix: "--hl-",
  variableDefaults: {},
  fontStyle: true,
});

let hl: ReturnType<typeof createHighlighterCoreSync> | null = null;
const highlighter = () =>
  (hl ??= createHighlighterCoreSync({
    themes: [theme],
    langs: [shellscript, json, jsonc, yaml, toml, ini, python, cpp, cmake, markdown, diff, typescript, javascript, powershell],
    engine: createJavaScriptRegexEngine(),
  }));

// fence info string → [shiki grammar, label shown in the block header]
const LANGS: Record<string, [string, string]> = {
  bash: ["shellscript", "bash"], sh: ["shellscript", "sh"], shell: ["shellscript", "shell"],
  zsh: ["shellscript", "zsh"], console: ["shellscript", "console"],
  json: ["json", "json"], jsonc: ["jsonc", "jsonc"], json5: ["jsonc", "json5"],
  yaml: ["yaml", "yaml"], yml: ["yaml", "yaml"], toml: ["toml", "toml"],
  conf: ["ini", "conf"], ini: ["ini", "ini"], kdl: ["ini", "kdl"],
  python: ["python", "python"], py: ["python", "python"],
  cpp: ["cpp", "c++"], "c++": ["cpp", "c++"], c: ["cpp", "c"], hpp: ["cpp", "c++"],
  cmake: ["cmake", "cmake"], markdown: ["markdown", "markdown"], md: ["markdown", "markdown"],
  diff: ["diff", "diff"], ts: ["typescript", "ts"], typescript: ["typescript", "ts"],
  js: ["javascript", "js"], javascript: ["javascript", "js"],
  powershell: ["powershell", "powershell"], ps1: ["powershell", "powershell"],
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const SHELL = new Set(["bash", "sh", "shell", "zsh"]);
const BLOCK_WORD = /^(then|do|done|fi|else|elif|esac|in|\}|\)|;;)\b/;

// Which lines of a shell block are commands you'd type at a prompt: not
// comments, blanks, indented bodies, continuations of a `\` line, heredoc
// bodies, or shell keywords that close a block. CSS hangs a `$` before them
// (a pseudo-element, so copying the block copies only the commands).
function commandLines(code: string): boolean[] {
  const out: boolean[] = [];
  let cont = false;
  let heredoc: string | null = null;
  for (const line of code.split("\n")) {
    if (heredoc !== null) {
      out.push(false);
      if (line.trim() === heredoc) heredoc = null;
      continue;
    }
    const cmd = !cont && line.length > 0 && !/^\s/.test(line) && !line.startsWith("#") && !BLOCK_WORD.test(line);
    out.push(cmd);
    cont = /\\\s*$/.test(line);
    const hd = line.match(/<<-?\s*['"]?(\w+)['"]?/);
    if (hd) heredoc = hd[1];
  }
  return out;
}

function markPrompts(html: string, code: string): string {
  if (code.split("\n").some((l) => l.startsWith("$ "))) return html; // already has prompts
  const cmds = commandLines(code);
  let i = 0;
  return html.replace(/<span class="line"/g, (m) => (cmds[i++] ? '<span class="line cmd"' : m));
}


/** Inner HTML for <code> plus the display label. Unknown/plain → escaped text. */
export function highlight(code: string, info: string): { html: string; label: string } {
  let key = info.trim().toLowerCase();
  // An unlabelled block whose every line is a shell command or a # comment is
  // shell — common in posts written before the fences were labelled.
  if (!key) {
    const lines = code.split("\n").filter((l) => l.trim());
    const cmd = /^\s*(\$ |#|(sudo|time|curl|wget|agentty|git|npm|npx|node|cd|export|make|cmake|python3?|pip|cargo|brew|chmod|ls|cat|echo|mkdir|rm|cp|mv|ssh|docker|apt|pacman)\b)/;
    if (lines.length && lines.every((l) => cmd.test(l))) key = "bash";
  }
  const lang = LANGS[key];
  if (!lang) return { html: esc(code), label: key && key !== "text" && key !== "txt" && key !== "plain" ? key : "" };
  try {
    const out = highlighter().codeToHtml(code, { lang: lang[0], theme: "site" });
    const inner = out.slice(out.indexOf("<code>") + 6, out.lastIndexOf("</code>"));
    return { html: SHELL.has(lang[1]) ? markPrompts(inner, code) : inner, label: lang[1] };
  } catch {
    return { html: esc(code), label: lang[1] };
  }
}
