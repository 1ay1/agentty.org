import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { stats } from "@/lib/stats";

// The category page. "Agent harness" is how agentty describes itself, so this
// is the canonical, quotable definition of the term — written to be the page
// that ranks (and that AI answer engines cite) when people search for it.

const URL = `${site.url}/agent-harness/`;
const TITLE = "What is an agent harness?";
const DESCRIPTION =
  "An agent harness is the software around an AI model that makes it a working agent: tools, sandbox, context and model routing. What it is and why it matters.";

const FAQ: [string, string][] = [
  [
    "What is an agent harness?",
    "An agent harness is the software that runs around a language model and turns it into an agent that does real work. The model only produces text; the harness gives it tools to call, runs those tools safely, decides what goes into the model's context, keeps the conversation going across many turns, and connects to whichever model provider you use.",
  ],
  [
    "Is an agent harness the same as a coding agent?",
    "A coding agent is an agent harness pointed at software work: its tools read, search and edit code, run builds and tests, and use git. The harness is the part that is independent of the model. agentty is a coding agent in that sense, and it calls itself a harness because it is built to work with any model rather than one vendor's.",
  ],
  [
    "Why does the harness matter if the model does the thinking?",
    "Because most of what makes an agent useful, safe and cheap happens outside the model: which tools it has and how well they report results, whether shell commands are sandboxed, how much irrelevant text is kept out of the context window, and whether you can switch models when a better or cheaper one appears. The same model can do very different work in two different harnesses.",
  ],
  [
    "Can I use my own model with an agent harness?",
    "That is the point of a model-independent harness. agentty works with the Claude, ChatGPT, GitHub Copilot or Kimi subscription you already have, with API keys for providers like OpenAI, DeepSeek, Gemini, Grok, Groq and OpenRouter, or with a local model through Ollama.",
  ],
];

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · agentty` },
  description: DESCRIPTION,
  keywords: ["agent harness", "AI agent harness", "what is an agent harness", "LLM harness", "coding agent", "agentty"],
  alternates: { canonical: "/agent-harness/" },
  openGraph: { type: "article", title: TITLE, description: DESCRIPTION, url: URL },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function AgentHarness() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${URL}#article`,
        headline: TITLE,
        description: DESCRIPTION,
        url: URL,
        inLanguage: "en",
        about: { "@type": "DefinedTerm", name: "agent harness", description: FAQ[0][1] },
        publisher: { "@type": "Organization", name: "agentty", url: site.url },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
          { "@type": "ListItem", position: 2, name: TITLE, item: URL },
        ],
      },
    ],
  };

  return (
    <article className="page post">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <span className="cur">Agent harness</span>
      </nav>
      <header className="post-head">
        <h1>{TITLE}</h1>
        <p className="lead">
          An <strong>agent harness</strong> is the software around an AI model that turns it into a working
          agent. The model decides what to do next; the harness gives it tools, runs them safely, manages
          what it remembers, and connects it to whichever model you choose.
        </p>
      </header>

      <div className="doc-body">
        <h2 id="the-model-and-the-harness">The model and the harness</h2>
        <p>
          A language model on its own only turns text into more text. It can&apos;t read your files, run your
          tests or remember yesterday&apos;s conversation. Everything that makes an AI coding tool feel like
          a colleague rather than a chat box lives outside the model, in the harness:
        </p>
        <ul>
          <li><strong>Tools.</strong> Functions the model can call: read and edit files, search code, run shell commands and builds, use git, fetch documentation. Good tools return results the model can act on in one step.</li>
          <li><strong>The loop.</strong> Send the conversation to the model, run the tools it asks for (often several at once), feed the results back, repeat until the task is done.</li>
          <li><strong>Safety.</strong> Permission rules for what the agent may do, and a sandbox so a shell command can&apos;t read your SSH keys or write outside the project.</li>
          <li><strong>Context.</strong> Deciding what goes into the model&apos;s limited context window: retrieving the relevant code instead of whole files, compacting long conversations, remembering facts across sessions.</li>
          <li><strong>Models.</strong> Talking to any provider, switching models mid-task, and routing simple work to cheaper models.</li>
          <li><strong>The interface.</strong> Where you watch and steer the work: a terminal UI, an editor panel, or a script.</li>
        </ul>
        <p>
          Swap the model and keep the harness, and your workflow stays the same. Keep the model and swap the
          harness, and the same model can be faster, cheaper, safer or simply better at the job.
        </p>

        <h2 id="harness-vs-coding-agent">Agent harness vs coding agent</h2>
        <p>
          &quot;Coding agent&quot; describes what the tool is for. &quot;Agent harness&quot; describes what it
          is: the part that is not the model. Tools like Claude Code and Codex CLI are harnesses built around
          their vendor&apos;s own models. A model-independent harness is built to work with any of them,
          including models running on your own machine.
        </p>

        <h2 id="what-makes-a-good-one">What makes a good agent harness</h2>
        <ul>
          <li><strong>Fast to start and light to run.</strong> You open it dozens of times a day; it shouldn&apos;t need a runtime to boot or eat memory while it waits.</li>
          <li><strong>Safe by default.</strong> Commands the model runs should be confined by the operating system, not just guarded by a confirmation prompt.</li>
          <li><strong>Frugal with context.</strong> Every token of irrelevant code costs money and attention. Retrieval beats pasting whole files.</li>
          <li><strong>Not locked to one model.</strong> The best or cheapest model changes every few months.</li>
          <li><strong>Inspectable.</strong> You should be able to see every tool call, every diff, and rewind when it goes wrong.</li>
        </ul>

        <h2 id="agentty">agentty: an agent harness for your terminal</h2>
        <p>
          <Link href="/">agentty</Link> is an open-source agent harness written in C++26: one {stats.sizeMB} static
          binary that starts in about {stats.coldStart}, with no Node, Python or Electron.
        </p>
        <ul>
          <li><strong>Any model.</strong> Sign in with the Claude Pro/Max, ChatGPT, GitHub Copilot or Kimi plan you already pay for, use an API key for OpenAI, DeepSeek, Gemini, Grok, Groq or OpenRouter, or run a local model through Ollama. <Link href="/docs/providers/">Providers</Link></li>
          <li><strong>Kernel-enforced sandbox.</strong> Every shell command runs inside claybin; <code>~/.ssh</code>, <code>~/.aws</code> and <code>.env</code> files are masked. <Link href="/docs/sandboxing/">Sandboxing</Link></li>
          <li><strong>Context it earns.</strong> Local retrieval (BM25 plus embeddings), automatic compaction and memory across sessions. <Link href="/docs/retrieval/">Retrieval</Link></li>
          <li><strong>Routing between models.</strong> Smart Mode puts each turn on the model it deserves and delegates mechanical work. <Link href="/docs/smart-mode/">Smart Mode</Link></li>
          <li><strong>Parallel tools and subagents.</strong> Independent tool calls run at once; a subagent can take a task in its own context. <Link href="/docs/tools/">Tools</Link></li>
          <li><strong>Anywhere you work.</strong> In the terminal, inside Zed over ACP, as an MCP server, or on an air-gapped machine over SSH. <Link href="/docs/acp/">ACP</Link></li>
        </ul>

        <h2 id="faq">Frequently asked questions</h2>
        {FAQ.map(([q, a]) => (
          <section key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </section>
        ))}

        <h2 id="try-it">Try it</h2>
        <p>One line installs it on Linux, macOS or Windows:</p>
        <div className="codeblock">
          <div className="codeblock-head"><span>sh</span></div>
          <pre className="code"><code>{site.installOneLiner}</code></pre>
        </div>
        <p>
          Then read the <Link href="/docs/quick-start/">quick start</Link>, or see how it compares with{" "}
          <Link href="/compare/agentty-vs-claude-code/">Claude Code</Link>.
        </p>
      </div>
    </article>
  );
}
