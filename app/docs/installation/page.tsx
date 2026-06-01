import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";
import { CopyRow } from "@/components/CopyRow";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Installation",
  description: "Install agentty in one line, or via your distro's package manager.",
  alternates: { canonical: "/docs/installation" },
};

export default function Installation() {
  return (
    <>
      <Breadcrumb title="Installation" />
      <h1>Installation</h1>
      <p className="lead">
        One line installs it. The same line updates it. Or use your package manager —
        deb, rpm, AUR, Homebrew, and Scoop are all published per release.
      </p>

      <h2 id="one-line">One-line install (recommended)</h2>
      <CopyRow cmd={site.installOneLiner} />
      <p style={{ marginTop: 18 }}>
        Detects your OS and arch, downloads the right binary from the latest release,
        verifies SHA256, and installs to <code>/usr/local/bin</code> (if root) or{" "}
        <code>~/.local/bin</code>. <strong>Re-running the same command updates</strong> to the
        newest release. No <code>apt</code>, no <code>brew</code>, no version drift.
      </p>
      <Note>
        Flags: <code>--prefix ~/somewhere</code>, <code>--version v0.1.0</code>. Prebuilt
        binaries for Linux (x86_64, aarch64) and Windows (x86_64); macOS builds from source
        in seconds.
      </Note>

      <h2 id="debian">Debian / Ubuntu</h2>
      <Code>{`curl -fsSLO https://github.com/1ay1/agentty/releases/latest/download/agentty_0.1.0_amd64.deb
sudo dpkg -i agentty_0.1.0_amd64.deb       # or agentty_0.1.0_arm64.deb`}</Code>
      <p>Update: <code>dpkg -i</code> the new release&apos;s <code>.deb</code>.</p>

      <h2 id="fedora">Fedora / RHEL / openSUSE</h2>
      <Code>{`sudo rpm -Uvh https://github.com/1ay1/agentty/releases/latest/download/agentty-0.1.0-1.x86_64.rpm`}</Code>
      <p><code>-U</code> is upgrade; works for the first install too.</p>

      <h2 id="arch">Arch Linux</h2>
      <Code>{`yay -S agentty-bin       # or paru, pikaur, etc.
yay -Syu agentty-bin     # update`}</Code>
      <p>Or install the release-page <code>.pkg.tar.zst</code> with <code>sudo pacman -U</code>.</p>

      <h2 id="macos">macOS (Homebrew)</h2>
      <Code>{`brew tap 1ay1/tap
brew install agentty
brew upgrade agentty     # update`}</Code>
      <p>Linux Homebrew gets the prebuilt static binary; macOS builds from source (~1 min).</p>

      <h2 id="windows">Windows</h2>
      <p>
        The easiest, warning-free way is a package manager — it installs from the
        signed release with no SmartScreen prompt:
      </p>
      <Code>{`winget install agentty
# or
scoop bucket add 1ay1 https://github.com/1ay1/scoop-bucket
scoop install agentty`}</Code>
      <p>
        Prefer a classic installer? Download and run the{" "}
        <a href="https://github.com/1ay1/agentty/releases/latest/download/agentty-windows-x86_64.msi">
          <code>.msi</code> installer
        </a>
        . It installs to <code>Program&nbsp;Files</code>, adds <code>agentty</code> to your
        <code> PATH</code>, creates a Start&nbsp;Menu entry, and registers a normal
        Add/Remove&nbsp;Programs entry for clean uninstall.
      </p>
      <p>
        Portable single <code>.exe</code> (no installer):{" "}
        <code>curl -L https://github.com/1ay1/agentty/releases/latest/download/agentty-windows-x86_64.exe -o agentty.exe</code>
      </p>

      <h2 id="raw">Raw static binaries</h2>
      <p>Fully-static, no shared-library dependencies. Drop and run:</p>
      <Code>{`curl -fsSL https://github.com/1ay1/agentty/releases/latest/download/agentty-linux-x86_64 -o agentty && chmod +x agentty
curl -fsSL https://github.com/1ay1/agentty/releases/latest/download/agentty-linux-aarch64 -o agentty && chmod +x agentty`}</Code>
      <p>Verify with <code>SHA256SUMS</code> on the release page.</p>

      <Note type="tip">
        Building from source? See <a href="/docs/building">Building from Source</a> for the
        CMake flags and toolchain requirements.
      </Note>

      <DocNav current="/docs/installation" />
      <EditThisPage path="app/docs/installation/page.tsx" />
    </>
  );
}
