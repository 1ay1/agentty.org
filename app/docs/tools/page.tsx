import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Tool Overview",
  description: "The full set of tools agentty can call, and how they render.",
  alternates: { canonical: "/docs/tools" },
};

const tools: [string, string, string][] = [
  ["read", "Read", "Read a file (or a line range). Large files return a symbol outline first."],
  ["write", "Write", "Create a new file with atomic write semantics."],
  ["edit", "Write", "Apply targeted text substitutions to an existing file; renders a diff."],
  ["bash", "Shell", "Run a shell command inside the sandbox; shows exit code + output."],
  ["grep", "Read", "Regex search across files, grouped by file with line numbers."],
  ["glob", "Read", "Find files by glob pattern."],
  ["list_dir", "Read", "List a directory with type, size, and name."],
  ["find_definition", "Read", "Locate a symbol definition across the codebase."],
  ["web_fetch", "Network", "Fetch a URL (capped output) for docs and APIs."],
  ["web_search", "Network", "Search the web and return result snippets."],
  ["todo", "Pure", "Maintain a session todo / plan list, rendered as a checklist."],
  ["diagnostics", "Shell", "Run the project's build/lint and surface errors and warnings."],
  ["skill", "Read", "Load a named skill's full instructions from .agentty/skills/ before attempting a task it covers."],
  ["task", "Shell", "Spawn an autonomous subagent (explorer / reviewer / tester / coder / general) with its own context and tool budget; returns one condensed report."],
  ["search_docs", "Read", "Query a knowledge corpus with agentty's hybrid BM25 + dense RAG pipeline; returns the most relevant passages."],
  ["git_status", "Read", "Show branch, staged/unstaged changes, untracked files."],
  ["git_diff", "Read", "Show a diff (unstaged, staged, or a ref range)."],
  ["git_log", "Read", "Show commit history."],
  ["git_commit", "Write", "Stage files and create a commit."],
  ["remember / forget", "Pure", "Persist or remove durable facts across sessions."],
  ["wipe_memory", "Pure", "Clear every remembered fact in a scope (confirm-gated)."],
];

export default function Tools() {
  return (
    <>
      <Breadcrumb title="Tool Overview" />
      <h1>Tool Overview</h1>
      <p className="lead">
        Each tool gets a purpose-built widget: diffs render as diffs, search results group
        by file with line numbers, bash shows exit codes, todos become checklists.
      </p>

      <div className="tablewrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr><th>Tool</th><th>Effect class</th><th>Description</th></tr>
          </thead>
          <tbody>
            {tools.map(([name, cls, desc]) => (
              <tr key={name}>
                <td className="mono"><code>{name}</code></td>
                <td>{cls}</td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Note>
        The <strong>effect class</strong> determines which permission profile auto-runs the
        tool. <em>Pure</em> and <em>Read</em> tools run automatically in{" "}
        <strong>Ask</strong> and <strong>Write</strong>; <em>Write</em>, <em>Shell</em>, and{" "}
        <em>Network</em> are gated by <a href="/docs/profiles">your profile</a>. The{" "}
        <strong>Minimal</strong> profile prompts on <em>every</em> class, reads included.
      </Note>

      <h2 id="enforcement">Compile-time enforcement</h2>
      <p>
        Each tool&apos;s effect set is declared at compile time and checked against the
        permission matrix via <code>static_assert</code>. A tool can&apos;t accidentally
        gain a side effect that the policy doesn&apos;t account for — the build catches it.
      </p>

      <DocNav current="/docs/tools" />
      <EditThisPage path="app/docs/tools/page.tsx" />
    </>
  );
}
