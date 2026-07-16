import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about agentty — the C++26 claude-code alternative: auth, providers, platforms, sandboxing, air-gap, storage, and licensing.",
  alternates: { canonical: "/docs/faq" },
};

// plain-text Q&A for FAQPage structured data (rich-result eligible)
const faqPlain: [string, string][] = [
  [
    "Does it work with my Claude Pro/Max subscription?",
    "Yes. OAuth against your existing Pro/Max plan is the main path — no extra billing, the same account you already pay for. You can also use an ANTHROPIC_API_KEY.",
  ],
  [
    "Is it really a drop-in for claude-code?",
    "It targets the same workflow — a coding agent in your terminal with the same Claude auth — as a single native binary. Claude is the default, but agentty also runs against OpenAI, Groq, OpenRouter, Together, Cerebras, and local Ollama models, switchable live.",
  ],
  [
    "Can I use models other than Claude?",
    "Yes. Pass --provider to point agentty at OpenAI, Groq, OpenRouter, Together, Cerebras, a local Ollama model, or any raw OpenAI-compatible host:port. --provider persists like -m, and you can switch backends live in-app with Ctrl-P.",
  ],
  [
    "Do I need Node or Python?",
    "No. agentty is a single static C++26 binary. No Node runtime, no npm install, no Python, no Electron.",
  ],
  [
    "What platforms are supported?",
    "Linux, macOS, and Windows — all built and tested daily. Prebuilt binaries ship for Linux (x86_64, aarch64) and Windows (x86_64); macOS builds from source in seconds.",
  ],
  [
    "How is it sandboxed?",
    "Every shell/build call runs in bwrap (Linux) or sandbox-exec (macOS). The workspace is read-write, system libs read-only, and ~/.ssh, /etc and other projects are blocked. Windows runs unsandboxed for now.",
  ],
  [
    "Can I run it on a machine with no internet?",
    "Yes. agentty airgap user@host relays traffic from your laptop over SOCKS5-over-SSH, with TLS pinned end-to-end.",
  ],
  [
    "Can I use it inside my editor?",
    "Yes. agentty acp runs agentty as an Agent Client Protocol agent inside Zed — streaming responses, inline diffs, native permission prompts, and session reload. Any ACP client works; it's the same engine as the TUI, just driven over JSON-RPC on stdio.",
  ],
  [
    "Where are my conversations stored?",
    "As plain JSON, one file per thread, under ~/.agentty/threads/. Safe to inspect, back up, or delete.",
  ],
  [
    "Is it stable / production ready?",
    "It is pre-1.0 and moving fast, but the core loop, tools, streaming, auth and persistence all work and get daily smoke testing. Treat it as a capable beta.",
  ],
  [
    "What license is it under?",
    "MIT. Use it, fork it, ship it.",
  ],
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqPlain.map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const faqs: [string, React.ReactNode][] = [
  [
    "Does it work with my Claude Pro/Max subscription?",
    <>Yes — OAuth against your existing Pro/Max plan is the main path. No extra billing; same account you already pay for. You can also use an <code>ANTHROPIC_API_KEY</code>, or a different <a href="/docs/providers">provider</a> entirely.</>,
  ],
  [
    "Is it really a drop-in for claude-code?",
    <>It targets the same workflow — a coding agent in your terminal with the same Claude auth — as a single native binary. Claude is the default, but agentty also runs against OpenAI, Groq, OpenRouter, Together, Cerebras, and local Ollama models. See <a href="/docs/providers">Providers &amp; Models</a>.</>,
  ],
  [
    "Can I use models other than Claude?",
    <>Yes. Pass <code>--provider</code> to point agentty at OpenAI, Groq, OpenRouter, Together, Cerebras, a local Ollama model, or any raw <code>host:port</code>. It persists like <code>-m</code>, and you can switch backends live in-app with <code>^P</code>. See <a href="/docs/providers">Providers &amp; Models</a>.</>,
  ],
  [
    "Do I need Node or Python?",
    <>No. agentty is a single static C++26 binary. No Node runtime, no <code>npm install</code>, no Python, no Electron.</>,
  ],
  [
    "What platforms are supported?",
    <>Linux, macOS, and Windows — all built and tested daily. Prebuilt binaries ship for Linux (x86_64, aarch64) and Windows (x86_64); macOS builds from source in seconds.</>,
  ],
  [
    "How is it sandboxed?",
    <>Every shell/build call runs in <code>bwrap</code> (Linux) or <code>sandbox-exec</code> (macOS). The workspace is read-write, system libs read-only, and <code>~/.ssh</code> / <code>/etc</code> / other projects are blocked. Windows runs unsandboxed for now.</>,
  ],
  [
    "Can I run it on a machine with no internet?",
    <>Yes. <code>agentty airgap user@host</code> relays traffic from your laptop over SOCKS5-over-SSH, with TLS pinned end-to-end. See the <a href="/docs/airgap">air-gap guide</a>.</>,
  ],
  [
    "Can I use it inside my editor?",
    <>Yes. <code>agentty acp</code> runs agentty as an <a href="/docs/acp">Agent Client Protocol</a> agent inside Zed — streaming responses, inline diffs, native permission prompts, and session reload. Any ACP client works; it&apos;s the same engine as the TUI, just over JSON-RPC on stdio.</>,
  ],
  [
    "Where are my conversations stored?",
    <>As plain JSON, one file per thread, under <code>~/.agentty/threads/</code>. Safe to inspect, back up, or delete.</>,
  ],
  [
    "Is it stable / production ready?",
    <>It&apos;s pre-1.0 and moving fast, but the core loop, tools, streaming, auth, and persistence all work and get daily smoke testing on Linux. Treat it as a capable beta.</>,
  ],
  [
    "What license is it under?",
    <>MIT. Use it, fork it, ship it. See the <a href="/license">license page</a>.</>,
  ],
];

export default function Faq() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Breadcrumb title="FAQ" />
      <h1>FAQ</h1>
      <p className="lead">Quick answers to the questions people ask most.</p>

      {faqs.map(([q, a], i) => (
        <div key={i}>
          <h2 id={`q${i}`} style={{ fontSize: 19 }}>{q}</h2>
          <p>{a}</p>
        </div>
      ))}

      <DocNav current="/docs/faq" />
      <EditThisPage path="app/docs/faq/page.tsx" />
    </>
  );
}
