// Record the REAL homepage TUI animation as video with a headless browser,
// so the README GIF is pixel-identical to agentty.org. Playwright records
// the actual compositor output at the page's real frame rate — no sampling
// drift, no reimplementation.
//
// Usage: node scripts/capture-demo.mjs <baseUrl> <outDir>
//   point it at a running static server (serving the `out/` export).

import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] || "http://localhost:4321";
const OUT = process.argv[3] || "/tmp/demo_real";
const LOOP_MS = 11500; // one full animation cycle (see AgenttyTui schedule)
const VIEW = { width: 812, height: 612 };

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEW,
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT, size: VIEW },
});
const page = await context.newPage();
await page.goto(`${BASE}/demo/`, { waitUntil: "networkidle" });

// Reload so recording captures from animation frame 0.
await page.reload({ waitUntil: "networkidle" });
await page.locator("#capture").waitFor({ state: "visible" });

// Let exactly one loop play (plus a hair so the loop seam is clean).
await page.waitForTimeout(LOOP_MS);

await context.close(); // flushes the .webm
await browser.close();

const vid = fs.readdirSync(OUT).find((f) => f.endsWith(".webm"));
console.log(`recorded -> ${OUT}/${vid}`);
