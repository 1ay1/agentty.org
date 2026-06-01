import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Workspace Boundary",
  description: "Why filesystem tools refuse paths outside your project, and how to opt out.",
  alternates: { canonical: "/docs/workspace" },
};

export default function Workspace() {
  return (
    <>
      <Breadcrumb title="Workspace Boundary" />
      <h1>Workspace Boundary</h1>
      <p className="lead">
        agentty&apos;s filesystem tools refuse any path outside the workspace root. The
        agent can&apos;t read or write your home directory, system files, or another
        project unless you explicitly allow it.
      </p>

      <h2 id="root">The workspace root</h2>
      <p>
        By default, the directory you launch in is the root. Every <code>read</code>,{" "}
        <code>write</code>, <code>edit</code>, <code>glob</code>, and <code>list_dir</code>{" "}
        call is checked against it — a path that escapes is rejected before the tool runs.
      </p>
      <Code>{`cd ~/code/my-app
agentty                          # root = ~/code/my-app
# read ../other-project/secret  → refused`}</Code>

      <h2 id="override">Pointing at another workspace</h2>
      <p>Run against a different project without changing directories:</p>
      <Code>{`agentty --workspace ~/code/other-project`}</Code>

      <h2 id="optout">Opting out</h2>
      <p>To remove the boundary entirely, set the workspace to the filesystem root:</p>
      <Code>{`agentty --workspace /`}</Code>
      <Note type="warn">
        <code>--workspace /</code> lets the agent touch any path your user can. Combined
        with the <a href="/docs/profiles">Write profile</a>, that&apos;s a lot of trust —
        use it deliberately.
      </Note>

      <h2 id="vs-sandbox">Boundary vs. sandbox</h2>
      <p>
        The workspace boundary and the <a href="/docs/sandboxing">sandbox</a> are two
        independent layers. The boundary governs agentty&apos;s own filesystem tools; the
        sandbox governs what spawned shell commands can reach. Both apply at once.
      </p>

      <DocNav current="/docs/workspace" />
      <EditThisPage path="app/docs/workspace/page.tsx" />
    </>
  );
}
