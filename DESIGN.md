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
- **A reading size and a chrome size.** Docs, blog, comparisons and the home
  page read at 13.5 px, ~80 columns (the column is still --measure wide); code
  and tables at 12.5 px; the nav, sidebars and labels stay small. Headings step up: page
  title 20, `##` 16, `###` 14.5, with more space above a heading than below it.
  Phones go a step down: prose 12, code 11, title 16, `##` 13.5, `###` 12.5.
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
  - **cyan**: structure and places. Section headings (`##`), paths, files,
    URLs, `host:port`
  - **green**: commands you'd type (a program with arguments), and tips
  - **yellow**: environment variables, flags and settings, and warnings
  - **blue**: names from code: `resolve()`, `std::move`, `no_new_privs`,
    `TIOCSTI`, agentty's tool names (`read`, `grep`), protocol methods
  - **orange**: values: modes and states (`none`, `partial`, `ask`), numbers,
    strings, `true` / `false`, model names
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

- Motion only where it carries information: the wordmark (a faithful port
  of agentty's welcome screen), the replayed demo (the program itself), the
  header's `▌` (agentty's cursor). The benchmark bars are static. No smooth
  scroll, no scroll effects. Hover changes colour or underline only.
- Page changes are instant and still: the new page replaces the old in one
  frame, the nav and docs sidebar never move, and the sidebar scrolls only
  when the active page would be out of sight. No cross-fade, no slide.
- Speed is part of the look: static pages, almost no JavaScript.
  Hovering a link fetches it (Next's router prefetch, a few KB), so a
  click lands on a page that's already here.

## Terminal touches

- A missing page is a shell error: `cd: no such file or directory`, and like a
  shell it suggests the closest real page (`did you mean /docs/sandboxing?`).
- The changelog opens with a `git log --graph --decorate` of releases: tags,
  dates, and `+added ~changed !fixed` counts in git's colours.
- Keys work like `less` and vim: `j k`, `d u`, `g g` / `G`, `{ }` for the
  previous / next section, `[ ]` for the previous / next page, `y` copies
  the page as markdown, `Y` the link, `t` picks a theme, `g` + a letter to
  jump, `?` for the list. `/` searches pages, sections, and every key,
  setting, env var and command in the docs' reference tables.
- A mode line along the bottom (desktop): the file you're reading, the
  section, the scheme, `Top / 42% / Bot`. Key messages show there, like
  vim's message line.
- Themes are agentty's: all 615 schemes from maya's `schemes.hpp`
  (scripts/gen-themes.mjs → public/themes.json), mapped onto the site's
  tokens by the same slots agentty uses. Picking one previews it live.
- The header reports the page's own weight (`187 KB · 0 cookies`), measured
  by the browser: the site measures itself the way it measures agentty.
- Printed, a page reads like a man page: `AGENTTY(1)` running header, CAPS
  section names, indented body, no navigation.
- Notes go in the margin: `[^id]` in markdown, `[^id]: text` on its own line.
  On a wide blog page they sit in a column beside the line that cites them;
  narrower, the bracketed number opens the note under its line.
- Every docs page says which release it describes (`for v0.9.51 · unchanged
  since v0.9.46`): the first tag containing the page's last commit, from
  sync-docs (lib/docs-versions.generated.json).

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
