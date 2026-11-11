# Design

agentty.org should look like the program: something a terminal could draw,
or text a man page could hold. If an element needs an illustration, an icon
or an animation to work, it doesn't belong.

## Layout

- **One left edge.** Everything hangs off `--gutter`: nav, headings, prose,
  the demo, bars, tables. Nothing is centered. Flush left, ragged right.
- **Labels in a left column**, like a man page: `install / sandbox / models`
  on the home page, the pager, the 404 list, the changelog log. Column widths
  are in `ch`, so things line up on the character grid.
- **Empty space on the right is a margin, not a gap.** Don't fill it. One
  counterweight on the right is enough (the nav's search / github / theme).
- **Hierarchy from space and weight**, not symmetry: vertical rhythm, bold
  vs dim vs faint, size.
- **Markers hang in the margin.** The text edge stays clean; `$`, `##`,
  list dashes, `note` / `tip` / `warn` and the nav's `>` sit just left of it
  (optical alignment). On phones there's no margin, so they fold back in.
- **A reading size and a chrome size.** Docs, blog and comparisons read at
  15 px, 72 columns (the column is still --measure wide); code and tables at
  13.5 px; the nav, sidebars and labels stay small. Headings step up: page
  title 24, `##` 18, `###` 16, with more space above a heading than below it.
  The opening paragraph (`.lead`) is a size up. Long `>` asides stay upright;
  only a one-line quote is italic.
- **Rows.** Every vertical space is a multiple of `--line`, one text row,
  as if the page were a terminal grid.
- **Tables are rules, not boxes**: a line above, one under the header, one
  below, faint lines between rows, no column lines, numbers right-aligned in
  tabular figures.

## Surface

- One monospace face. Two weights.
- Flat colours: ink in three shades (`--text`, `--text-dim`, `--text-faint`),
  one accent, and a few colours that mean something, the way agentty colours
  its own output. Never decoration:
  - **magenta** (the accent), spent rarely: agentty, the `$` prompt, its own
    bar, the nav's `>`, the selected item, and link underlines (the text
    turns magenta only on hover)
  - **cyan**: structure. Section headings (`##`) and paths / files in code
  - **green**: commands you'd type (a program with arguments), and tips
  - **yellow**: environment variables and settings, and warnings
  - **blue**: code symbols (`resolve()`, `std::move`) and agentty's tool names
    (`read`, `grep`, `repo_map`)
  Inline code is classified at build time (lib/markdown.ts `codeKind`);
  anything it can't name stays ink.
- Selection and keyboard focus are inverse video, like a terminal.
- No cards, shadows, rounded corners or gradients. Hairlines only where
  data needs separating (tables, the nav).
- No icons and no emoji. Use words (`copy`, `menu`, `dark`) and the
  characters a terminal has: `→ · × ▌ │ ─ $`.

## Words

- **Numbers, not adjectives.** "47 ms to ready", not "blazing-fast". Quote
  measured numbers through `{{bench.*}}` tokens so they never go stale.
- Say what it does, plainly. Lowercase labels and links, the nav included. ISO dates (`2026-11-09`),
  real versions (`v0.9.51`).

## Motion

- None, beyond the wordmark (a faithful port of agentty's welcome screen),
  the replayed demo, which are the program itself, and the header's `▌`,
  which blinks like agentty's cursor. No fades, no smooth scroll, no scroll
  effects. Hover changes colour or underline only.
- Speed is part of the look: static pages, almost no JavaScript.

## Terminal touches

- A missing page is a shell error: `cd: no such file or directory`, and like a
  shell it suggests the closest real page (`did you mean /docs/sandboxing?`).
- The changelog opens with a `git log --oneline` of releases.
- Keys work like `less`: `j k`, `d u`, `g g` / `G`, `[ ]` for the previous /
  next page, `g` + a letter to jump, `?` for the list.
- The header reports the page's own weight (`187 KB · 0 cookies`), measured
  by the browser: the site measures itself the way it measures agentty.
- Printed, a page reads like a man page: `AGENTTY(1)` running header, CAPS
  section names, indented body, no navigation.

## The terminal edition

`curl agentty.org/<any page>` returns that page rendered for an 80-column
terminal (lib/term.ts, lib/term-pages.ts → out/t/**/index.ansi; nginx routes
command-line clients there, deploy/agentty-term.nginx). Same rules as the
web: text edge at column 4, `##` / `-` / `$` hung into the margin, one
accent, faint for the quiet parts. Colours are the terminal's own 16, so it
follows the reader's theme. Links are OSC 8. Nothing is wider than 80
columns unless the source line itself is (then it's placed, never mangled).

`curl -fsSL agentty.org/bench | sh` (public/bench) measures the agents on
the reader's own machine and draws the same bars.

## Docs that can't lie

A ```` ```run ```` block holds one `agentty …` command. At build,
scripts/capture-output.mjs runs it against the real binary and the docs show
the real output, labelled `output from v0.9.51, captured at build`.

## Clips: the docs show the real program

Hover (or tap, or focus) a key like `Ctrl+K`, or a phrase with a dotted
magenta underline, and a small window plays a few seconds of the real
agentty doing it. Clips are recorded from the binary in a PTY with a scripted
model, in both themes, load only when asked for, and re-record themselves
when agentty changes (RECORDINGS.md). In markdown: any `[[key]]` with a clip
lights up by itself; `[text](clip:<id>)` marks a phrase. Raw markdown and the
terminal edition show plain text.

## Not this

No fake `ls -la` listings, typing animations, ASCII-art borders or other
terminal costume. A touch belongs only if agentty itself would do it.
