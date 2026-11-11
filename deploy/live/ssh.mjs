// ssh.mjs: `ssh agentty.org` (on LIVE_SSH_PORT).
//
// No account, no password: any name gets in, and what it gets is not a shell.
// It is the site's terminal edition (the same 80-column pages curl gets,
// /t/<path>/index.ansi) in a pager with less's keys, whose links you can walk
// with Tab and open with Enter; and on `a`, the real agentty in the same
// sandbox the homepage's "try it live" uses (startSession). Nothing typed here
// reaches a shell on this machine.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ssh2 from "ssh2";

const { Server } = ssh2;
const SITE = process.env.LIVE_SITE_ROOT || "/var/www/agentty.org";
const KEY = process.env.LIVE_SSH_HOSTKEY || path.join(process.env.HOME || "/tmp", ".config/agentty-live/ssh_host_ed25519_key");
const ORIGIN = "https://agentty.org";
const MAX_CONN = Number(process.env.LIVE_SSH_MAX || 40);

function hostKey() {
  if (!fs.existsSync(KEY)) {
    fs.mkdirSync(path.dirname(KEY), { recursive: true, mode: 0o700 });
    execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-C", "agentty.org", "-f", KEY]);
  }
  return fs.readFileSync(KEY);
}

// a page of the terminal edition: lines + every OSC 8 link in it
const OSC8 = /\x1b\]8;;([^\x1b]*)\x1b\\([\s\S]*?)\x1b\]8;;\x1b\\/g;
function page(p) {
  const clean = ("/" + p).replace(/\/+/g, "/").replace(/\/$/, "");
  if (clean.includes("..")) return null;
  const file = path.join(SITE, "t", clean, "index.ansi");
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch { return null; }
  const lines = text.replace(/\n$/, "").split("\n");
  const links = [];
  lines.forEach((l, row) => {
    for (const m of l.matchAll(OSC8)) links.push({ row, href: m[1], text: m[2] });
  });
  return { path: clean || "/", lines, links };
}
const visible = (s) => s.replace(/\x1b\]8;;[^\x1b]*\x1b\\/g, "").replace(/\x1b\[[0-9;]*m/g, "");

export function startSsh({ port, startSession }) {
  let conns = 0;
  const server = new Server({ hostKeys: [hostKey()], banner: undefined, ident: "agentty.org" }, (client, info) => {
    if (++conns > MAX_CONN) { conns--; client.end(); return; }
    const ip = info.ip;
    client.on("authentication", (ctx) => ctx.accept());   // anyone: there is nothing to protect behind it
    client.on("close", () => conns--);
    client.on("error", () => {});
    client.on("ready", () => {
      client.on("session", (accept) => {
        const session = accept();
        let pty = { cols: 80, rows: 24 };
        let resizeTarget = null;
        session.on("pty", (ok, _r, info) => { pty = { cols: info.cols, rows: info.rows }; ok?.(); });
        session.on("window-change", (ok, _r, info) => {
          pty = { cols: info.cols, rows: info.rows };
          ok?.();
          resizeTarget?.(pty.cols, pty.rows);
        });
        session.on("exec", (ok, _r, info) => {
          // `ssh agentty.org docs/sandboxing` prints that page and exits, like curl
          const s = ok();
          const pg = page(String(info.command || "").trim()) ?? page("404");
          s.write((pg ? pg.lines.join("\n") : "not found") + "\n");
          s.exit(0); s.end();
        });
        session.on("shell", (ok) => {
          const out = ok();
          reader(out, ip, () => pty, (fn) => (resizeTarget = fn), startSession);
        });
      });
    });
  });
  server.on("error", (e) => console.error("[ssh]", e.message));
  server.listen(port, "0.0.0.0", () => console.log(`[ssh] listening on :${port}`));
  return server;
}

function reader(out, ip, size, onResize, startSession) {
  const ESC = "\x1b[";
  let cur = page("/") ?? { path: "/", lines: ["agentty.org"], links: [] };
  const history = [];
  let top = 0, sel = -1, msg = "", live = null;

  const status = () => {
    const { cols } = size();
    const pos = cur.lines.length <= size().rows - 1 ? "All" : top === 0 ? "Top" : top >= cur.lines.length - (size().rows - 1) ? "Bot" : `${Math.round((top / Math.max(1, cur.lines.length - size().rows + 1)) * 100)}%`;
    const left = ` agentty.org${cur.path === "/" ? "" : cur.path}  ${msg || (sel >= 0 ? "⏎ " + cur.links[sel].href.replace(ORIGIN, "") : "")}`;
    const right = `${pos}  j/k ⇥ links ⏎ open ← back  a agentty (^] leaves)  q quit `;
    const room = cols - visible(right).length;
    const l = left.length > room ? left.slice(0, Math.max(0, room - 1)) + "…" : left.padEnd(room);
    return `${ESC}7m${l}${right.slice(0, Math.max(0, cols - l.length))}${ESC}27m`;
  };
  const draw = () => {
    if (live) return;
    const { rows } = size();
    const h = rows - 1;
    top = Math.max(0, Math.min(top, cur.lines.length - h));
    let s = `${ESC}?25l${ESC}H`;
    for (let i = 0; i < h; i++) {
      const r = top + i;
      let line = cur.lines[r] ?? "";
      if (sel >= 0 && cur.links[sel].row === r) {
        // the selected link in reverse video; the rest of the line as written
        let n = 0;
        const want = cur.links.filter((x, j) => x.row === r && j < sel).length;
        line = line.replace(OSC8, (m, href, text) => (n++ === want ? `\x1b]8;;${href}\x1b\\${ESC}7m${visible(text)}${ESC}27m\x1b]8;;\x1b\\` : m));
      }
      s += `${line}${ESC}0m${ESC}K\r\n`;
    }
    s += status();
    out.write(s);
  };
  const go = (p, push = true) => {
    const next = page(p);
    if (!next) { msg = `not on the terminal edition: ${ORIGIN}${p}`; return draw(); }
    if (push) history.push({ cur, top, sel });
    cur = next; top = 0; sel = -1; msg = "";
    draw();
  };
  const back = () => {
    const h = history.pop();
    if (!h) return;
    ({ cur, top, sel } = h); msg = ""; draw();
  };
  const seek = (dir) => {
    if (!cur.links.length) return;
    const h = size().rows - 1;
    // the next link on screen in that direction, else the next one anywhere
    const onScreen = cur.links.map((l, i) => [l, i]).filter(([l]) => l.row >= top && l.row < top + h).map(([, i]) => i);
    if (sel < 0 || !onScreen.includes(sel)) sel = dir > 0 ? (onScreen[0] ?? 0) : (onScreen.at(-1) ?? cur.links.length - 1);
    else sel = (sel + dir + cur.links.length) % cur.links.length;
    const row = cur.links[sel].row;
    if (row < top) top = row; else if (row >= top + h) top = row - h + 1;
    msg = ""; draw();
  };
  const open = () => {
    if (sel < 0) return;
    const href = cur.links[sel].href;
    if (href.startsWith(ORIGIN + "/")) {
      const p = href.slice(ORIGIN.length).split("#")[0];
      if (!/\.[a-z0-9]+$/i.test(p)) return go(p);
    }
    msg = `open in your browser (click it): ${href}`;
    draw();
  };
  const runAgentty = () => {
    const { cols, rows } = size();
    out.write(`${ESC}?7h${ESC}?25h${ESC}2J${ESC}H`);
    const s = startSession(ip, cols, rows, {
      kind: "ssh",
      send: (d) => out.write(d),
      close: (reason) => {
        live = null;
        onResize(null);
        out.write(`${ESC}?1049h${ESC}?7l${ESC}0m${ESC}2J`);
        msg = `agentty: ${reason}`;
        draw();
      },
    });
    if (typeof s === "string") { out.write(`${ESC}?7l`); msg = s; return draw(); }
    live = s;
    onResize((c, r) => s.resize(c, r));
  };

  out.write(`${ESC}?1049h${ESC}?7l${ESC}2J`);
  draw();
  onResize(() => draw());

  out.on("data", (buf) => {
    const k = buf.toString("utf8");
    if (live) {
      if (k === "\x1d") return live.end("detached");          // Ctrl+], as in telnet: back to the pager
      return live.write(k);
    }
    const h = size().rows - 1;
    switch (k) {
      case "q": case "\x03": case "\x04":
        out.write(`${ESC}0m${ESC}?7h${ESC}?25h${ESC}?1049l`);
        out.write(`agentty.org · install: curl -fsSL https://agentty.org/install.sh | sh\r\n`);
        out.exit(0); out.end(); return;
      case "j": case "\x1b[B": top++; break;
      case "k": case "\x1b[A": top--; break;
      case " ": case "f": case "\x1b[6~": case "\x06": top += h; break;
      case "b": case "\x1b[5~": case "\x02": top -= h; break;
      case "d": top += h >> 1; break;
      case "u": top -= h >> 1; break;
      case "g": case "\x1b[H": top = 0; break;
      case "G": case "\x1b[F": top = cur.lines.length; break;
      case "\t": case "n": return seek(1);
      case "\x1b[Z": case "N": return seek(-1);
      case "\r": case "l": case "\x1b[C": return open();
      case "\x1b[D": case "h": case "\x7f": return back();
      case "a": return runAgentty();
      case "H": return go("/");
      default: return;
    }
    if (sel >= 0) { const row = cur.links[sel].row; if (row < top || row >= top + h) sel = -1; }
    msg = "";
    draw();
  });
  out.on("close", () => { live?.end("client disconnected"); });
}
