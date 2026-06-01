import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Acknowledgements",
  description: "The projects and people that make agentty possible.",
  alternates: { canonical: "/acknowledgements" },
};

const deps: [string, string, string][] = [
  ["maya", "https://github.com/1ay1/maya", "The sister TUI engine agentty renders through — owns every glyph, layout, and animation."],
  ["OpenSSL", "https://www.openssl.org/", "TLS and cryptography for the HTTP/2 transport and OAuth (PKCE)."],
  ["nghttp2", "https://nghttp2.org/", "The HTTP/2 implementation behind the streaming Anthropic provider."],
  ["nlohmann/json", "https://github.com/nlohmann/json", "JSON parsing and serialization for the API and thread persistence."],
  ["Bubblewrap", "https://github.com/containers/bubblewrap", "The Linux sandbox (bwrap) that isolates shell and build calls."],
  ["CMake", "https://cmake.org/", "The build system that produces the single static binary across platforms."],
];

export default function Acknowledgements() {
  return (
    <div className="page">
      <h1>Acknowledgements</h1>
      <p className="lead">
        agentty stands on the shoulders of excellent open source software. Thank you to the
        maintainers of every project below.
      </p>

      <h2>Built with</h2>
      <ul>
        {deps.map(([name, url, desc]) => (
          <li key={name}>
            <a href={url} target="_blank" rel="noopener noreferrer"><strong>{name}</strong></a>{" "}
            — {desc}
          </li>
        ))}
      </ul>

      <h2>Inspiration</h2>
      <p>
        agentty exists because of <a href="https://www.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic&apos;s</a>{" "}
        Claude and the <code>claude-code</code> experience — the goal was a native,
        dependency-free client for the same workflow. Backoff and transport details drew on
        ideas from the Zed editor&apos;s Anthropic crate.
      </p>

      <h2>Contributors</h2>
      <p>
        agentty is maintained by its contributors. See the full list on{" "}
        <a href={`${site.github}/graphs/contributors`} target="_blank" rel="noopener noreferrer">GitHub</a>.
        Want to join them? Start with the <a href="/contributing">contributing guide</a>.
      </p>

      <h2>License</h2>
      <p>
        agentty is released under the <a href="/license">MIT License</a>. Bundled
        third-party components retain their own licenses; see the repository for details.
      </p>
    </div>
  );
}
