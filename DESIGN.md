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
  counterweight on the right is enough (the nav's search / github / theme,
  the status line's links).
- **Hierarchy from space and weight**, not symmetry: vertical rhythm, bold
  vs dim vs faint, size.

## Surface

- One monospace face. Two weights.
- Flat colours: ink in three shades (`--text`, `--text-dim`, `--text-faint`)
  and **one accent**. The accent means "agentty / this / the current one /
  act here": the brand mark, the `$` prompt, agentty's own bar, links,
  the selected item. Never decoration.
- No cards, shadows, rounded corners or gradients. Hairlines only where
  data needs separating (tables, the status line).
- No icons and no emoji. Use words (`copy`, `menu`, `dark`) and the
  characters a terminal has: `→ · × ▌ │ ─ $`.

## Words

- **Numbers, not adjectives.** "47 ms to ready", not "blazing-fast". Quote
  measured numbers through `{{bench.*}}` tokens so they never go stale.
- Say what it does, plainly. Lowercase labels. ISO dates (`2026-11-09`),
  real versions (`v0.9.51`).

## Motion

- None, beyond the wordmark (a faithful port of agentty's welcome screen)
  and the replayed demo, which are the program itself. No fades, no smooth
  scroll, no scroll effects. Hover changes colour or underline only.
- Speed is part of the look: static pages, almost no JavaScript.

## Terminal touches

- The footer is a status line: version, license, size, launch time, build date.
- A missing page is a shell error: `cd: no such file or directory`.
- The changelog opens with a `git log --oneline` of releases.
- `?` lists keyboard shortcuts; `g` + a letter jumps (`g d` docs, `g c` changelog).
