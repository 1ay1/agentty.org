import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about agentty — the C++26 claude-code alternative: auth, platforms, sandboxing, air-gap, storage, and licensing.",
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
    "It targets the same workflow — a Claude coding agent in your terminal with the same auth — as a single native binary. It is Claude-only by design; if you need many providers, aider is the better fit.",
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
    "Where are my conversations stored?",
    "As plain JSON, one file per thread, under ~/.agentty/threads/<workspace-hash>/. Safe to inspect, back up, or delete.",
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
    <>Yes — OAuth against your existing Pro/Max plan is the main path. No extra billing; same account you already pay for. You can also use an <code>ANTHROPIC_API_KEY</code>.</>,
  ],
  [
    "Is it really a drop-in for claude-code?",
    <>It targets the same workflow — a Claude coding agent in your terminal with the same auth — as a single native binary. It is Claude-only by design; if you need many providers, aider is the better fit.</>,
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
    "Where are my conversations stored?",
    <>As plain JSON, one file per thread, under <code>~/.agentty/threads/&lt;workspace-hash&gt;/</code>. Safe to inspect, back up, or delete.</>,
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
