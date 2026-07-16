import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Sandboxing",
  description: "How agentty isolates shell and build calls with bwrap and sandbox-exec.",
  alternates: { canonical: "/docs/sandboxing" },
};

export default function Sandboxing() {
  return (
    <>
      <Breadcrumb title="Sandboxing" />
      <h1>Sandboxing</h1>
      <p className="lead">
        Every shell and build call runs inside a sandbox by default — not as an opt-in, not
        as an afterthought. An approved <code>bash</code> call still can&apos;t read your
        SSH keys.
      </p>

      <h2 id="how">How it works</h2>
      <ul>
        <li><strong>Linux:</strong> commands run inside <code>bwrap</code> (Bubblewrap).</li>
        <li><strong>macOS:</strong> commands run inside <code>sandbox-exec</code>.</li>
        <li><strong>Windows:</strong> runs unsandboxed — no first-class equivalent yet.</li>
      </ul>

      <h2 id="policy">What&apos;s reachable</h2>
      <p>Inside the Linux (bwrap) sandbox:</p>
      <ul>
        <li><strong>Read-write:</strong> the workspace directory, plus a fresh <code>tmpfs</code> mounted at <code>/tmp</code>.</li>
        <li><strong>Read-only:</strong> system libraries and binaries (<code>/usr</code>, <code>/bin</code>, <code>/lib</code>, <code>/opt</code> …) so builds and toolchains work.</li>
        <li><strong>Reachable:</strong> the network (<code>--share-net</code>) — so <code>git push</code>, <code>npm</code>, and <code>curl</code> still work.</li>
        <li><strong>Blocked (not mounted):</strong> <code>$HOME</code>, <code>~/.ssh</code>, and every other project on the machine.</li>
        <li><strong>Only an allow-list of <code>/etc</code> is exposed</strong> — <code>resolv.conf</code>, <code>hosts</code>, CA certs, <code>gitconfig</code> and a few others are readable so networking and git identity work; the rest of <code>/etc</code> (e.g. <code>shadow</code>, keytabs, corporate config) is invisible.</li>
      </ul>
      <p>
        Hardened with <code>--unshare-pid</code>, <code>--new-session</code>, and{" "}
        <code>--die-with-parent</code>. macOS uses <code>sandbox-exec</code> with a{" "}
        <code>(deny default)</code> profile: broad file reads, writes restricted to the
        workspace + temp dirs, network open.
      </p>

      <Note type="tip">
        The practical upshot: even if you approve a shell command in the autonomous{" "}
        <a href="/docs/profiles">Write profile</a>, it can&apos;t{" "}
        <code>cat ~/.ssh/id_rsa</code> or tamper with other projects on the machine.
      </Note>

      <h2 id="modes">Modes</h2>
      <p>Control the sandbox with <code>--sandbox</code>:</p>
      <div className="tablewrap" style={{ marginBottom: 24 }}>
        <table>
          <thead><tr><th>Mode</th><th>Behaviour</th></tr></thead>
          <tbody>
            <tr><td className="mono"><code>auto</code> (default)</td><td>Use the OS sandbox backend if present; otherwise run unsandboxed with a warning.</td></tr>
            <tr><td className="mono"><code>on</code></td><td>Require a backend — exit rather than run <code>bash</code>/<code>diagnostics</code> unsandboxed.</td></tr>
            <tr><td className="mono"><code>off</code></td><td>Disable the sandbox entirely.</td></tr>
          </tbody>
        </table>
      </div>
      <Note type="warn">
        Running with <code>--workspace /</code> makes the whole filesystem writable, so the
        sandbox reports as <em>degraded</em> — there&apos;s no directory left to contain. Keep
        the workspace scoped to your project to preserve containment.
      </Note>

      <h2 id="example">Concrete example</h2>
      <p>An approved build command sees the workspace and system libs, but secrets stay out of reach:</p>
      <Code>{`# inside the sandbox
$ cmake --build build -j     # works — workspace + system libs reachable
$ cat ~/.ssh/id_rsa          # blocked — home dir not mounted writable/readable`}</Code>

      <Note type="warn">
        Sandboxing reduces blast radius; it is not a substitute for review. Treat network
        access inside the sandbox as real — a command can still exfiltrate workspace
        contents if you approve it.
      </Note>

      <DocNav current="/docs/sandboxing" />
      <EditThisPage path="app/docs/sandboxing/page.tsx" />
    </>
  );
}
