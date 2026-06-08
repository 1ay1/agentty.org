import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";
import { CopyRow } from "@/components/CopyRow";
import { site } from "@/lib/site";
import { release, versionLabel } from "@/lib/release";

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

      <h2 id="latest">Latest release</h2>
      <p>
        <strong>{versionLabel}</strong>
        {release.publishedAt && (
          <> · published {new Date(release.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</>
        )}{" "}
        · <a href={release.url} target="_blank" rel="noopener noreferrer">release notes &amp; checksums ↗</a>
      </p>
      {release.platforms.length > 0 && (
        <div className="tablewrap" style={{ marginBottom: 24 }}>
          <table>
            <thead>
              <tr><th>Platform</th><th>Binary</th><th>Size</th><th>SHA-256</th></tr>
            </thead>
            <tbody>
              {release.platforms.map((p) => (
                <tr key={p.key}>
                  <td>{p.label}</td>
                  <td className="mono">
                    <a href={p.url} target="_blank" rel="noopener noreferrer"><code>{p.name}</code></a>
                  </td>
                  <td className="mono"><span className="win">{p.sizeMB}</span></td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {p.sha256 ? <code>{p.sha256.slice(0, 16)}…</code> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 id="one-line">One-line install (recommended)</h2>
      <CopyRow cmd={site.installOneLiner} />
      <p style={{ marginTop: 18 }}>
        Detects your OS and arch, downloads the right binary from the latest release,
        verifies SHA256, and installs to <code>/usr/local/bin</code> (if root) or{" "}
        <code>~/.local/bin</code>. <strong>Re-running the same command updates</strong> to the
        newest release. No <code>apt</code>, no <code>brew</code>, no version drift.
      </p>
      <Note>
        Flags: <code>--prefix ~/somewhere</code>, <code>--version {versionLabel}</code>,{" "}
        <code>--no-verify</code>, <code>--build</code> (force a source build). Prebuilt
        binaries for Linux (x86_64, i686), macOS (Apple&nbsp;Silicon &amp; Intel), and
        Windows (x86_64). On any other platform the script builds from source
        automatically. Works with <code>curl</code> or <code>wget</code>.
      </Note>

      <h2 id="debian">Debian / Ubuntu</h2>
      <Code>{`curl -fsSLO https://github.com/1ay1/agentty/releases/latest/download/agentty_${release.version}_amd64.deb
sudo dpkg -i agentty_${release.version}_amd64.deb       # or agentty_${release.version}_arm64.deb`}</Code>
      <p>Update: <code>dpkg -i</code> the new release&apos;s <code>.deb</code>.</p>

      <h2 id="fedora">Fedora / RHEL / openSUSE</h2>
      <Code>{`sudo rpm -Uvh https://github.com/1ay1/agentty/releases/latest/download/agentty-${release.version}-1.x86_64.rpm`}</Code>
      <p><code>-U</code> is upgrade; works for the first install too.</p>

      <h2 id="arch">Arch Linux</h2>
      <Code>{`yay -S agentty-bin       # or paru, pikaur, etc.
yay -Syu agentty-bin     # update`}</Code>
      <p>Or install the release-page <code>.pkg.tar.zst</code> with <code>sudo pacman -U</code>.</p>

      <h2 id="macos">macOS</h2>
      <p>
        The one-line installer above ships prebuilt binaries for both Apple&nbsp;Silicon
        (<code>arm64</code>) and Intel (<code>x86_64</code>) and strips the Gatekeeper
        quarantine flag for you, so it just runs:
      </p>
      <CopyRow cmd={site.installOneLiner} />
      <p>Homebrew (once the tap lands):</p>
      <Code>{`brew tap 1ay1/tap
brew install agentty
brew upgrade agentty     # update`}</Code>

      <h2 id="windows">Windows</h2>
      <p>The fastest way — one line in PowerShell:</p>
      <CopyRow cmd={site.installOneLinerWindows} />
      <p>
        Downloads <code>agentty.exe</code>, verifies its SHA256, installs to{" "}
        <code>%LOCALAPPDATA%\agentty</code>, and adds it to your user <code>PATH</code>.
        Or use a package manager (no SmartScreen prompt):
      </p>
      <Code>{`winget install agentty
# or
scoop bucket add 1ay1 https://github.com/1ay1/scoop-bucket
scoop install agentty`}</Code>
      <p>
        Portable single <code>.exe</code> (no installer):{" "}
        <code>curl -L https://github.com/1ay1/agentty/releases/latest/download/agentty-windows-x86_64.exe -o agentty.exe</code>
      </p>

      <h2 id="raw">Raw static binaries</h2>
      <p>Fully-static, no shared-library dependencies. Drop and run:</p>
      <Code>{`# Linux x86_64
curl -fsSL https://github.com/1ay1/agentty/releases/latest/download/agentty-linux-x86_64 -o agentty && chmod +x agentty
# Linux i686 (32-bit)
curl -fsSL https://github.com/1ay1/agentty/releases/latest/download/agentty-linux-i686 -o agentty && chmod +x agentty
# macOS (Apple Silicon / Intel)
curl -fsSL https://github.com/1ay1/agentty/releases/latest/download/agentty-macos-arm64 -o agentty && chmod +x agentty
curl -fsSL https://github.com/1ay1/agentty/releases/latest/download/agentty-macos-x86_64 -o agentty && chmod +x agentty`}</Code>
      <p>
        Each release asset carries a published SHA256 (shown on the release page and
        verified automatically by the one-line installer).
      </p>

      <Note type="tip">
        Building from source? See <a href="/docs/building">Building from Source</a> for the
        CMake flags and toolchain requirements.
      </Note>

      <DocNav current="/docs/installation" />
      <EditThisPage path="app/docs/installation/page.tsx" />
    </>
  );
}
