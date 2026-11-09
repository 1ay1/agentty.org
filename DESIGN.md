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
- **80 columns.** Prose is `--measure` = 80 characters wide, a terminal's
  width. Only the demo, bars and tables may go wider.
- **Rows.** Every vertical space is a multiple of `--line`, one text row,
  as if the page were a terminal grid.
- **Tables are rules, not boxes**: a line above, one under the header, one
  below, faint lines between rows, no column lines, numbers right-aligned in
  tabular figures.

## Surface

- One monospace face. Two weights.
- Flat colours: ink in three shades (`--text`, `--text-dim`, `--text-faint`)
  and **one accent**, spent rarely. It means "agentty / this / the current
  one": the brand mark, the `$` prompt, agentty's own bar, the nav's `>`,
  the selected item. Links are ink with a faint underline; they turn magenta
  only on hover.
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
  the replayed demo, which are the program itself, and one blinking block
  cursor after the home heading. No fades, no smooth scroll, no scroll
  effects. Hover changes colour or underline only.
- Speed is part of the look: static pages, almost no JavaScript.

## Terminal touches

- A missing page is a shell error: `cd: no such file or directory`.
- The changelog opens with a `git log --oneline` of releases.
- `?` lists keyboard shortcuts; `g` + a letter jumps (`g d` docs, `g c` changelog).
- Printed, a page reads like a man page: `AGENTTY(1)` running header, CAPS
  section names, indented body, no navigation.

## Not this

No fake `ls -la` listings, typing animations, ASCII-art borders or other
terminal costume. A touch belongs only if agentty itself would do it.
