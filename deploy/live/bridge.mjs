// bridge.mjs — runs INSIDE each live session's sandbox (bwrap --unshare-net).
//
// The sandbox has no network at all, only its own loopback. agentty still has
// to reach the mock model, so this listens on the sandbox's 127.0.0.1:11434
// and pipes each connection to the mock's unix socket, bound read-only into
// the sandbox. Once it is listening it starts agentty on the same terminal
// and exits with it. Nothing else leaves the sandbox.
import net from "node:net";
import { spawn } from "node:child_process";

const [sock, bin, ...args] = process.argv.slice(2);
const server = net.createServer((c) => {
  const up = net.connect(sock);
  c.pipe(up).pipe(c);
  const done = () => { c.destroy(); up.destroy(); };
  c.on("error", done); up.on("error", done);
});
server.listen(11434, "127.0.0.1", () => {
  const child = spawn(bin, args, { stdio: "inherit" });
  child.on("exit", (code, sig) => process.exit(sig ? 1 : code ?? 0));
  for (const s of ["SIGTERM", "SIGHUP", "SIGINT"]) process.on(s, () => child.kill(s));
});
