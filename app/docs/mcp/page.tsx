import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "MCP Server",
  description:
    "Serve agentty's native tools over the Model Context Protocol, and consume other MCP servers from inside agentty.",
  alternates: { canonical: "/docs/mcp" },
};

export default function Mcp() {
  return (
    <>
      <Breadcrumb title="MCP Server" />
      <h1>MCP Server</h1>
      <p className="lead">
        agentty speaks the <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">Model Context Protocol</a> both ways:
        it can <strong>serve</strong> its native tools to any MCP client, and
        <strong> consume</strong> tools from other MCP servers inside a thread.
      </p>

      <h2 id="serve">Serving agentty&apos;s tools (mcp-serve)</h2>
      <p>
        <code>agentty mcp-serve</code> runs headless — no terminal UI — and exposes
        agentty&apos;s native toolset over MCP on stdio. An external MCP client
        (Claude Desktop, an IDE, another agent) drives <code>tools/list</code> and{" "}
        <code>tools/call</code> over stdin/stdout; diagnostics go to stderr.
      </p>
      <Code>{`agentty mcp-serve`}</Code>
      <p>
        The served tools are the same ones the TUI uses: file{" "}
        <code>read</code>/<code>write</code>/<code>edit</code>, shell{" "}
        <code>bash</code>, code search (<code>grep</code>/<code>glob</code>/
        <code>find_definition</code>), <code>web_fetch</code>/<code>web_search</code>,{" "}
        <code>diagnostics</code>, and the <code>git_*</code> family. Filesystem tools
        stay sandboxed to the <a href="/docs/workspace">workspace boundary</a> and
        shell calls run inside the <a href="/docs/sandboxing">OS sandbox</a>, exactly
        as they do interactively.
      </p>

      <h2 id="client-config">Point a client at it</h2>
      <p>
        Any MCP client can launch agentty as a stdio server. For a client that reads
        a JSON config (Claude Desktop shown here):
      </p>
      <Code>{`{
  "mcpServers": {
    "agentty": {
      "command": "agentty",
      "args": ["mcp-serve"]
    }
  }
}`}</Code>

      <h2 id="consume">Consuming other MCP servers</h2>
      <p>
        The reverse also works: drop a <code>.agentty/mcp.json</code> in your project
        and agentty connects to those servers on startup, appending their tools to
        its own registry. The model can&apos;t tell an MCP tool from a native one —
        and <code>tools/list_changed</code> is honoured live, so a server that adds a
        tool mid-session becomes callable on the next turn.
      </p>
      <Code>{`{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    }
  }
}`}</Code>
      <Note type="note">
        MCP consumption is lazy and opt-in — with no{" "}
        <code>.agentty/mcp.json</code> present, startup is a single{" "}
        <code>stat()</code> that returns nothing, so there is zero overhead when you
        aren&apos;t using it.
      </Note>

      <DocNav current="/docs/mcp" />
      <EditThisPage path="app/docs/mcp/page.tsx" />
    </>
  );
}
