import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contributing",
  description: "How to contribute to agentty — bugs, code, and the maintainer workflow.",
  alternates: { canonical: "/contributing" },
};

export default function Contributing() {
  return (
    <div className="page">
      <h1>Contributing</h1>
      <p className="lead">
        agentty is open source under the MIT license. Bug reports, fixes, and well-scoped
        features are all welcome.
      </p>

      <h2>Reporting bugs</h2>
      <p>
        File issues on{" "}
        <a href={site.issues} target="_blank" rel="noopener noreferrer">GitHub</a>. For a
        rendering bug, include your <code>$TERM</code>, your terminal emulator name, and a
        screenshot. For a code-path bug, paste the relevant block and your{" "}
        <code>git rev-parse HEAD</code> (or the release version from <code>agentty --version</code>).
      </p>

      <h2>Setting up</h2>
      <ol>
        <li>Fork and clone with submodules: <code>git clone --recursive</code>.</li>
        <li>Build: <code>cmake -B build &amp;&amp; cmake --build build -j</code>.</li>
        <li>Run the tests with <code>-DAGENTTY_BUILD_TESTS=ON</code> (needs GCC or stock Clang, not AppleClang).</li>
      </ol>
      <p>See <a href="/docs/building">Building from Source</a> for toolchain requirements.</p>

      <h2>Code conventions</h2>
      <ul>
        <li><strong>The reducer stays pure.</strong> Side effects go through <code>Cmd</code>, never inline in the update function.</li>
        <li><strong>The permission matrix is the contract.</strong> New tools declare their effect set; <code>static_assert</code> enforces it at compile time.</li>
        <li><strong>The host builds Configs, maya builds Elements.</strong> Keep rendering logic out of the host.</li>
        <li>Use the strong ID newtypes — don&apos;t pass raw strings where a <code>ThreadId</code> or <code>ToolCallId</code> belongs.</li>
      </ul>

      <h2>Pull requests</h2>
      <ul>
        <li>Keep PRs focused — one logical change per PR.</li>
        <li>Describe the behavior change and how you verified it.</li>
        <li>Update <code>CHANGELOG.md</code> under <strong>Unreleased</strong> for user-visible changes.</li>
        <li>Make sure the build is green on Linux at minimum.</li>
      </ul>

      <h2>Releases</h2>
      <p>
        Maintainers cut releases with one command:{" "}
        <code>scripts/cut-release.sh X.Y.Z</code> bumps the version, promotes the{" "}
        <code>CHANGELOG.md</code> <strong>Unreleased</strong> section to a dated entry, commits,
        tags <code>vX.Y.Z</code>, and pushes. The tag push fires GitHub Actions, which builds
        every artifact (deb/rpm/pkg.tar.zst/tarball/binaries) and auto-submits to
        Homebrew/Scoop/winget/AUR. Single source of truth: <code>CMakeLists.txt</code>.
      </p>

      <h2>Code of Conduct</h2>
      <p>
        By participating you agree to uphold our{" "}
        <a href="/code-of-conduct">Code of Conduct</a>. Be kind, be constructive.
      </p>
    </div>
  );
}
