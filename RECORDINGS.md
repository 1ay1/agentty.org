# Recordings

Everything that shows agentty moving is a real recording of the real binary:
the session on the home page, the clips in the docs (hover a key like
`Ctrl+K`, or a phrase with a dotted underline), and the README's GIF
(https://agentty.org/agentty.gif, the home session filmed off the live page). They're
recorded in a PTY with a scripted model, in both of agentty's themes, and
they stay current by themselves.

## It updates itself

`deploy/agentty-recordings.timer` runs `deploy/recordings.sh` every 3 hours,
and the deploy webhook runs it a minute after an agentty release is published.
It compares the latest release with the versions the recordings show
(`demo/recordings.json`, `public/clips/manifest.json`). When agentty moved,
it re-records in its own checkout (`~/.cache/agentty-recordings`), checks
every recording, commits what passed and pushes, which deploys the site.

Nothing broken is published:

- the home session must pass `scripts/check-demo.mjs` (every tool card
  finished, none half-drawn or duplicated),
- every clip must pass its own `expect` checks (text that has to be on
  screen at a named moment).

A recording that shows the same UI as the published one (timings and
spinners aside) keeps the published file, so a release that didn't change
the UI adds nothing to git. The raw PTY captures are never committed. The
GIF lives in `/var/www/agentty-media`, outside git and the deploy, and is
re-filmed (`scripts/render-gif.mjs`) once a new home session is live.

A recording that fails keeps its last good version and is listed in the log
(`/tmp/agentty-recordings.log`). Usually that means agentty's UI changed and
the clip's key script or checks need a look.

## By hand

```sh
node scripts/update-recordings.mjs            # whatever is out of date
node scripts/update-recordings.mjs --force    # everything
node scripts/record-clips.mjs model-picker    # one clip
node scripts/clips-coverage.mjs               # which docs keys have a clip
AGENTTY_BIN=~/src/agentty/build/agentty …     # record an unreleased build
```

## Adding a clip

1. Add an entry to `scripts/demo-clips.mjs`: a title, the keys in the docs
   that should show it (`on`, optionally limited to a heading with `context`),
   the key script (`keys`), scripted model turns if it needs the model
   (`steps`), and `expect` checks for the moments that matter (`mark`).
2. `node scripts/record-clips.mjs <id>`. If a check fails, the report prints
   the screen at that moment.
3. Any `[[key]]` it lists in `on` now plays it. To mark a phrase in the docs
   (agentty repo, `docs/website/*.md`), write `[the model picker](clip:model-picker)`.
   An unrecorded clip renders as plain text, never as a broken link.

Run `node scripts/clips-coverage.mjs` to see which keys still have no clip.
