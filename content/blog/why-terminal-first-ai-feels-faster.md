---
title: "Why terminal-first AI feels faster than web-based tools"
date: 2026-08-05
author: agentty
tags: [terminal, ux, performance, deep-dive]
excerpt: "I benchmarked it instead of trusting the vibe: agentty cold-starts at 1.2ms p50, claude-code at 122ms p50, on the same machine, same session — a ~100x gap that has nothing to do with model speed. Here's the actual latency chain a browser-hosted tool can't architect its way out of, the honest counterarguments, and the raw numbers to reproduce yourself."
---

# Why terminal-first AI feels faster than web-based tools

I kept telling myself the "terminal agents feel snappier" thing was probably
just vibes — recency bias, or me liking the aesthetic of green text on black.
So I stopped asserting it and measured it instead, on one machine, back to
back, right before writing this.

```
$ python3 -c "
import subprocess, time
times = []
for _ in range(30):
    t0 = time.perf_counter()
    subprocess.run(['claude', '--version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    times.append((time.perf_counter() - t0) * 1000)
times.sort()
n = len(times)
print(f'n={n} min={times[0]:.1f}ms p50={times[n//2]:.1f}ms p95={times[int(n*0.95)]:.1f}ms')
"
n=30 min=117.8ms p50=122.4ms p95=144.3ms
```

```
$ python3 -c "... same loop, agentty --version ..."
n=50 min=1.073ms p50=1.206ms p95=1.601ms
```

Same box, same shell, same minute. **~100x**, p50 to p50. Not a number from
a slide deck — reproduce it yourself, methodology below. That gap has
*nothing* to do with which model answers your prompt. It's entirely the
cost of the wrapper around the model, and it's worth understanding exactly
where it comes from, because "the model is the bottleneck" — which is true
for token generation — quietly stops being true for everything else you do
in a session.

## Where 120ms actually goes

`claude --version` doesn't touch the network — it's a pure local cold
start, and it's still ~120ms because the binary is a POSIX shell shim that
`exec`s into a Node app:

```
#!/bin/sh
export DISABLE_UPDATES=1
export DISABLE_INSTALLATION_CHECKS=1
exec /opt/claude-code/bin/claude "$@"
```

Isolating just the interpreter's own boot floor, no app code at all:

```
$ time node -e '1'
min=41.7ms p50=46.3ms max=53.3ms   (n=20)
```

So roughly a third of the 122ms is V8 spinning up before a single line of
the CLI's own code runs — `require()` graph walked, JIT warming, module
resolution across however many `node_modules` packages the tool ships.
The other ~80ms is the app's own init on top of that floor. Compare install
footprints while we're here:

```
/opt/claude-code       224M
~/.local/bin/agentty     16M
```

agentty is one statically-linked ELF binary — no `node_modules`, no
interpreter to boot, no JIT to warm. `poll(2)`, a state machine, a render
loop. There's no 40ms floor to pay because there's no VM underneath it.

## The latency chain nobody benchmarks

"Time to first token from the API" is the number every provider publishes.
It's also the *smallest* piece of what you experience in a live session,
because a coding session isn't one long generation — it's dozens of short
round trips (a quick question, a tool call, a diff approval, an "undo
that"), and the fixed per-interaction overhead compounds every single one:

1. **Cold start of the app itself** — measured above: ~120ms for a
   Node-shimmed CLI vs. ~1ms for a static binary, before either has done
   any actual work.
2. **Keystroke → input handler → virtual DOM diff** — a web textarea's
   keystrokes round-trip through a framework's event system and often a
   re-render, even for "just" a controlled input.
3. **Send → network hop to a hosted backend** — a browser-hosted tool
   inserts a hop the terminal agent skips entirely: browser → your ISP →
   the vendor's edge → their orchestration layer → the model provider.
   Each hop is TCP/TLS overhead and jitter you don't control, paid on
   *every message*, independent of the model's own latency.
4. **Streaming tokens → DOM mutation, layout, paint** — each streamed
   token becomes a DOM mutation, triggers style recalc, gets painted.
   Browsers batch this well, but it isn't free — re-highlighting a growing
   code fence on every chunk is a classic web-tool stutter source, and if
   the UI runs on a garbage-collected runtime, a GC pause can land mid-stream
   and drop a frame.
5. **Your eyes → your hands, but your hands never left the mouse** — every
   "approve this edit," "switch model," "open this file" that requires a
   *click* costs a keyboard→pointer→keyboard context switch, on the order
   of 200-400ms of motor-planning overhead per round trip.

A terminal-first agent collapses 1, 2, and 4 to near-zero and skips 5
outright, because the entire interface — including tool-call approval,
model switching, and history — lives on the keyboard's turf, not a
browser's.

## No DOM, no GC pauses — just a redraw loop

agentty's render loop ([built on maya](https://github.com/1ay1/maya), its
own C++ TUI engine) is a `poll(2)` over the model stream and your input
file descriptor: a chunk arrives, state updates, one frame diff computes
against a cell buffer, only the changed terminal cells get written. No
layout pass, no paint pass, no reflow — a terminal cell grid has no CSS
box model cascading through it. And because the binary has no garbage
collector, nothing can pause the draw loop mid-stream. Chunk N and chunk
10,000 land on the next frame with the same latency.

## The honest counterargument

"The model is the bottleneck, not the UI" is *correct* for the thing it's
usually said about — one long generation, tokens/sec, time-to-first-token.
No client trick makes the model answer faster. Where it stops applying is
the other 90% of a session: the short round trips where fixed per-message
overhead, not model throughput, dominates what you feel. A tool adding
120ms of chrome to every one of those round trips adds up across a session
even when the model behind both tools is byte-for-byte identical.

It's also fair to push back that 120ms is imperceptible *once* — and it
is. The case isn't "you'll notice one cold start." It's that the same
category of overhead (chrome, not model) recurs on every keystroke, every
streamed token, and every mouse trip for the whole session, and *that*
compounds into something you feel even if no single instance of it does.

## Reproduce it yourself

```bash
# cold start, apples to apples
python3 -c "
import subprocess, time
times = []
for _ in range(30):
    t0 = time.perf_counter()
    subprocess.run(['<your-tool>', '--version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    times.append((time.perf_counter() - t0) * 1000)
times.sort()
n = len(times)
print(f'min={times[0]:.1f}ms p50={times[n//2]:.1f}ms p95={times[int(n*0.95)]:.1f}ms')
"
```

Or just watch it: stream a long response with a big syntax-highlighted
code block in a browser-hosted tool, then do the same in a terminal agent.
The terminal one won't drop a frame — a direct, structural consequence of
having no DOM, no GC, and no network hop to a hosted UI to pay for.

## Frequently asked

**Is a terminal AI tool actually faster, or does it just feel faster?**
Both, and they're the same thing measured two ways. Cold start is a
number you can log (1.2ms vs. 122ms above), and "feel" is human
perception of the *other* costs — DOM mutation, layout, GC pauses — that
don't show up in a tokens/sec benchmark but do show up in every keystroke.

**Does this apply to every web-based AI tool, or just bad ones?**
The category, not the implementation quality. Even a perfectly engineered
web app still boots a JS runtime, hydrates a framework, and mutates a DOM
per token — that's the platform's floor, not a bug. A terminal binary's
floor is a `poll()` loop and a cell-buffer diff, structurally lower no
matter how well either side is written.

**Is this specific to agentty, or true of terminal tools generally?**
The category argument (no DOM, no browser hop, no GC-driven jank) holds
for any native terminal tool. The specific numbers above are agentty's —
a static C++26 binary with [its own TUI renderer](https://github.com/1ay1/maya),
not a wrapped web view — and claude-code's, measured on the same box.

**Does terminal-first mean I lose a GUI entirely?**
No — agentty also runs natively [inside Zed over ACP](/docs/acp), same
zero-DOM render loop, with an editor's chrome around it instead of a
raw terminal.

## Get it

```bash
curl -fsSL https://agentty.org/install.sh | sh
```

agentty is a single 16MB static binary, MIT-licensed.
[Source](https://github.com/1ay1/agentty) — the render loop is short
enough to read in one sitting, so don't take the numbers above on faith
either.
