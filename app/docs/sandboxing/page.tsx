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
      <p>Inside the sandbox:</p>
      <ul>
        <li><strong>Read-write:</strong> the workspace directory.</li>
        <li><strong>Read-only:</strong> system libraries (so builds work).</li>
        <li><strong>Reachable:</strong> the network.</li>
        <li><strong>Read-only / blocked:</strong> <code>~/.ssh</code>, <code>/etc</code>, and other projects.</li>
      </ul>

      <Note type="tip">
        The practical upshot: even if you approve a shell command in the autonomous{" "}
        <a href="/docs/profiles">Write profile</a>, it can&apos;t{" "}
        <code>cat ~/.ssh/id_rsa</code> or tamper with other projects on the machine.
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
