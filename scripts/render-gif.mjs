#!/usr/bin/env node
// Render the home page demo to a GIF: the README's picture of agentty.
//
//   node scripts/render-gif.mjs [url] [out.gif]
//     url  default https://agentty.org/ (any page with the home demo)
//     out  default /var/www/agentty-media/agentty.gif (served as
//          https://agentty.org/agentty.gif, outside git and the deploy's rsync)
//
// It films the real player on the real page, frame by frame: Playwright's
// fake clock steps the replay 1/30 s at a time and each distinct frame is
// screenshotted, so the GIF is exactly what a visitor sees (same font, same
// drawing), with no dropped frames and no wall-clock jitter. ffmpeg makes the
// palette and the GIF. Needs playwright-core + its Chromium, and ffmpeg.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const URL = process.argv[2] || "https://agentty.org/";
const OUT = process.argv[3] || "/var/www/agentty-media/agentty.gif";
const WIDTH = 780;                 // the README shows it at 780 px
const FPS = 30, STEP = 1000 / FPS;
const HOLD_END_MS = 3500;          // rest on the finished session before looping

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agentty-gif-"));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1, colorScheme: "dark" });
  await page.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch {} });
  await page.clock.install();
  await page.goto(URL, { waitUntil: "networkidle" });
  const box = page.locator(".replay").first();
  await box.scrollIntoViewIfNeeded();
  // let the player load its recording (a real fetch) and adopt the first frame
  for (let i = 0; i < 100 && !(await page.$(".replay-grid[data-live]")); i++) { await page.clock.runFor(50); await page.waitForTimeout(20); }
  if (!(await page.$(".replay-grid[data-live]"))) throw new Error("the demo player never started");
  // from here time moves only when we step it (screenshots take real time)
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));

  const frames = [];                // [file, ms]
  let last = null, n = 0;
  const shoot = async () => {
    const buf = await box.screenshot({ type: "png" });
    if (last && buf.equals(last)) { frames[frames.length - 1][1] += STEP; return; }
    const f = path.join(tmp, `f${String(n++).padStart(5, "0")}.png`);
    fs.writeFileSync(f, buf);
    frames.push([f, STEP]);
    last = buf;
  };
  await shoot();
  for (let i = 0; i < FPS * 120; i++) {                 // at most two minutes
    await page.clock.runFor(STEP);
    await shoot();
    if (await page.locator(".replay-again").isVisible()) break;
  }
  frames[frames.length - 1][1] += HOLD_END_MS;
  console.log(`${frames.length} distinct frames, ${(frames.reduce((a, f) => a + f[1], 0) / 1000).toFixed(1)} s`);

  // ffmpeg concat list with each frame's duration (the last one repeated, as concat requires)
  const list = frames.map(([f, ms]) => `file '${f}'\nduration ${(ms / 1000).toFixed(4)}`).join("\n") + `\nfile '${frames.at(-1)[0]}'\n`;
  fs.writeFileSync(path.join(tmp, "list.txt"), list);
  const gif = path.join(tmp, "out.gif");
  execFileSync("ffmpeg", ["-v", "error", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "list.txt"),
    "-vf", `scale=${WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`,
    "-loop", "0", "-y", gif]);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.copyFileSync(gif, OUT + ".part");
  fs.renameSync(OUT + ".part", OUT);
  console.log(`${OUT}: ${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB`);
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
