import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Community",
  description: "Get involved with agentty — contribute, report bugs, and help others.",
  alternates: { canonical: "/community" },
};

export default function Community() {
  return (
    <div className="page">
      <h1>Community</h1>
      <p className="lead">
        agentty is built in the open. Whether you write C++, file good bug reports, or help
        others get unstuck — there&apos;s a way to pitch in.
      </p>

      <p>
        <strong>Join the Discord</strong> to ask questions, share sessions, and get help — the
        server has an <strong>AI helper bot</strong> that answers agentty questions using the
        real agent.{" "}
        <a href={site.discord} target="_blank" rel="noopener noreferrer">discord.gg/agentty →</a>
      </p>

      <h2>Ways to get involved</h2>
      <ul>
        <li><strong>Join the <a href={site.discord} target="_blank" rel="noopener noreferrer">Discord</a></strong> — chat, get help, and ask the AI helper bot anything.</li>
        <li><strong>Star &amp; watch</strong> the <a href={site.github} target="_blank" rel="noopener noreferrer">repository</a> to follow releases.</li>
        <li><strong>Report bugs</strong> on the <a href={site.issues} target="_blank" rel="noopener noreferrer">issue tracker</a> — include <code>$TERM</code>, emulator, version, and a screenshot.</li>
        <li><strong>Open a PR</strong> — read the <a href="/contributing">contributing guide</a> first.</li>
        <li><strong>Improve the docs</strong> — typos, gaps, and clarifications are all welcome.</li>
        <li><strong>Help triage</strong> — reproduce reported issues and add detail.</li>
      </ul>

      <h2>Good first contributions</h2>
      <ul>
        <li>Tighten an error message or a status string.</li>
        <li>Add a troubleshooting entry for something that tripped you up.</li>
        <li>Test a code path on macOS or Windows and report what you find.</li>
        <li>Improve a tool widget&apos;s rendering for an edge case.</li>
      </ul>

      <h2>Project links</h2>
      <ul>
        <li><a href={site.discord} target="_blank" rel="noopener noreferrer">Discord</a> — the community chat, with an AI helper bot.</li>
        <li><a href={site.github} target="_blank" rel="noopener noreferrer">Source code</a> — the agentty repository.</li>
        <li><a href={site.releasesLatest} target="_blank" rel="noopener noreferrer">Releases</a> — prebuilt binaries and packages.</li>
        <li><a href={site.maya} target="_blank" rel="noopener noreferrer">maya</a> — the sister TUI engine agentty renders through.</li>
      </ul>

      <h2>Be excellent to each other</h2>
      <p>
        Participation is governed by our <a href="/code-of-conduct">Code of Conduct</a>.
        Keep it kind, keep it constructive.
      </p>
    </div>
  );
}
