import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Providers & Models",
  description:
    "Run agentty against Claude, OpenAI, Groq, OpenRouter, Together, Cerebras, Ollama, or any OpenAI-compatible endpoint.",
  alternates: { canonical: "/docs/providers" },
};

export default function Providers() {
  return (
    <>
      <Breadcrumb title="Providers & Models" />
      <h1>Providers &amp; Models</h1>
      <p className="lead">
        agentty ships with Claude as the default, but it speaks to any
        OpenAI-compatible backend. Pick one with <code>--provider</code>, or switch
        live mid-thread with <code>^P</code> (provider) and <code>^/</code> (model).
      </p>

      <h2 id="default">The default: Claude</h2>
      <p>
        With no flags, agentty talks to Anthropic using your{" "}
        <a href="/docs/authentication">Claude Pro/Max OAuth</a> subscription or an{" "}
        <code>sk-ant-…</code> API key. Nothing to configure.
      </p>
      <Code>{`agentty                        # Claude, OAuth or API key
agentty -m claude-opus-4-5     # pick a specific Claude model`}</Code>

      <h2 id="switch">Switching providers</h2>
      <p>
        <code>--provider</code> selects the backend. It is persisted between runs
        just like <code>-m</code>, so you only pass it when you want to change it.
      </p>
      <Code>{`agentty --provider openai -m gpt-4o        # GPT
agentty --provider groq -m llama-3.3-70b   # Groq
agentty --provider ollama -m qwen2.5-coder # local model, no key
agentty --provider openrouter              # any model via OpenRouter`}</Code>
      <p>
        Inside a thread, press <code>^P</code> to switch provider and <code>^/</code>{" "}
        to switch model — no restart, no re-auth. Both are also reachable from the
        command palette (<code>^K</code>). The next turn uses the new backend.
      </p>

      <h2 id="supported">Supported providers</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Backend</th><th>Key</th></tr>
          </thead>
          <tbody>
            <tr><td className="mono"><code>anthropic</code></td><td>Claude — OAuth (Pro/Max) or API key. <strong>The default.</strong></td><td><code>agentty login</code></td></tr>
            <tr><td className="mono"><code>openai</code></td><td>GPT / o-series on <code>api.openai.com</code></td><td><code>OPENAI_API_KEY</code></td></tr>
            <tr><td className="mono"><code>groq</code></td><td>Llama / Mixtral on Groq LPUs — very fast</td><td><code>GROQ_API_KEY</code></td></tr>
            <tr><td className="mono"><code>openrouter</code></td><td>Any model via <code>openrouter.ai</code></td><td><code>OPENROUTER_API_KEY</code></td></tr>
            <tr><td className="mono"><code>together</code></td><td>Open models on <code>together.ai</code></td><td><code>TOGETHER_API_KEY</code></td></tr>
            <tr><td className="mono"><code>cerebras</code></td><td>Wafer-scale inference — very fast</td><td><code>CEREBRAS_API_KEY</code></td></tr>
            <tr><td className="mono"><code>ollama</code></td><td>Local models at <code>localhost:11434</code></td><td>None</td></tr>
            <tr><td className="mono"><code>host:port</code></td><td>Any raw OpenAI-compatible endpoint</td><td><code>OPENAI_API_KEY</code></td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="keys">API keys</h2>
      <p>
        Hosted OpenAI-compatible providers read their key from the
        provider-specific environment variable (e.g. <code>GROQ_API_KEY</code>),
        falling back to <code>OPENAI_API_KEY</code>, or an explicit{" "}
        <code>-k &lt;key&gt;</code> for the session. Ollama needs no key.
      </p>
      <Code>{`export GROQ_API_KEY=gsk_…
agentty --provider groq -m llama-3.3-70b

# or a one-off, never written to disk:
agentty --provider openai -k sk-… -m gpt-4o`}</Code>

      <h2 id="local">Local models (Ollama)</h2>
      <p>
        Point agentty at a model served by Ollama on{" "}
        <code>localhost:11434</code> — no key, no cloud, no data leaving your
        machine. agentty uses Ollama&apos;s native <code>/api/chat</code> protocol
        and salvages tool calls that weaker local models leak as raw JSON, so even
        smaller models can drive the full tool suite.
      </p>
      <Code>{`ollama pull qwen2.5-coder
agentty --provider ollama -m qwen2.5-coder`}</Code>

      <Note type="note">
        <code>--provider</code> and <code>-m</code> persist between sessions. Run{" "}
        <code>agentty --provider anthropic</code> to switch back to Claude, or just
        press <code>^P</code> in-app.
      </Note>

      <DocNav current="/docs/providers" />
      <EditThisPage path="app/docs/providers/page.tsx" />
    </>
  );
}
