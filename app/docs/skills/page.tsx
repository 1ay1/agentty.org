import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Agent Skills",
  description:
    "Teach agentty your codebase once with a SKILL.md — it's live the next turn. Compatible with Claude Code's skills format.",
  alternates: { canonical: "/docs/skills" },
};

export default function Skills() {
  return (
    <>
      <Breadcrumb title="Agent Skills" />
      <h1>Agent Skills</h1>
      <p className="lead">
        A skill is a folder with a <code>SKILL.md</code> that teaches agentty your
        conventions, DSLs, and tribal knowledge. Drop one in and it&apos;s live the
        next turn — no rebuild, no restart.
      </p>

      <h2 id="why">Why skills</h2>
      <p>
        On codebases with internal DSLs or house conventions, curated skills push
        agent accuracy from roughly 20% to 85%. The model discovers a skill by its
        name and summary, then loads the full instructions only when the task calls
        for it — so a big library of skills costs almost nothing per turn.
      </p>

      <h2 id="format">Writing a skill</h2>
      <p>
        A <code>SKILL.md</code> is Markdown with a small YAML frontmatter block. The
        directory name is the skill&apos;s slug.
      </p>
      <Code>{`---
name: house-style
description: This project's commit + code conventions. Load before committing or refactoring.
---

# House style

- Commit messages are single-line, imperative, no AI attribution.
- Prefer \`edit\` over rewriting whole files.
- Run \`cmake --build build -j\` to build; tests live in tests/.`}</Code>
      <p>
        The <code>description</code> is what the model sees in the catalog — write it
        so it&apos;s obvious <em>when</em> to load the skill. The body is only pulled
        into context on demand.
      </p>

      <h2 id="locations">Where skills live</h2>
      <p>
        agentty scans these roots for <code>&lt;name&gt;/SKILL.md</code>. Earlier
        roots win when two skills share a name (project shadows personal; native
        <code>.agentty</code> shadows the interop dirs):
      </p>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Location</th><th>Scope</th></tr></thead>
          <tbody>
            <tr><td className="mono"><code>&lt;project&gt;/.agentty/skills/</code></td><td>This repo (native)</td></tr>
            <tr><td className="mono"><code>&lt;project&gt;/.agents/skills/</code></td><td>This repo (shared agents format)</td></tr>
            <tr><td className="mono"><code>&lt;project&gt;/.claude/skills/</code></td><td>This repo (Claude Code compat)</td></tr>
            <tr><td className="mono"><code>~/.agentty/skills/</code></td><td>Every project (native, personal)</td></tr>
            <tr><td className="mono"><code>~/.agents/skills/</code></td><td>Every project (shared agents format)</td></tr>
            <tr><td className="mono"><code>~/.claude/skills/</code></td><td>Every project (Claude Code compat)</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="bundled">Bundled resources</h2>
      <p>
        A skill folder can ship supporting files — scripts, reference docs,
        templates — alongside its <code>SKILL.md</code>. agentty enumerates them
        (bounded to a shallow depth) and read-allowlists the skill directory, so the
        model can fetch a bundled reference even when it lives outside the workspace
        boundary. Those reads are read-only; the write gate never consults them.
      </p>

      <h2 id="validate">Linting your skills</h2>
      <p>
        <code>agentty skills</code> lists every discovered skill with spec-lint
        diagnostics and exits non-zero on warnings — drop it in CI to catch a broken
        or mis-named skill before it ships.
      </p>
      <Code>{`agentty skills   # list + validate; exit 1 on warnings`}</Code>

      <Note type="note">
        Skills are compatible with Claude Code&apos;s <code>.claude/skills/</code>{" "}
        format, so an existing skill library works in agentty unchanged.
      </Note>

      <DocNav current="/docs/skills" />
      <EditThisPage path="app/docs/skills/page.tsx" />
    </>
  );
}
