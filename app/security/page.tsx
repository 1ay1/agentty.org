import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security Policy",
  description: "How to report a security vulnerability in agentty.",
};

export default function Security() {
  return (
    <div className="page">
      <h1>Security Policy</h1>
      <p className="lead">
        We take the security of agentty seriously — it handles your Anthropic credentials
        and executes shell commands on your behalf.
      </p>

      <h2>Reporting a vulnerability</h2>
      <p>
        Please <strong>do not</strong> open a public issue for security vulnerabilities.
        Instead, report privately through GitHub&apos;s{" "}
        <a href={`${site.github}/security/advisories/new`} target="_blank" rel="noopener noreferrer">
          private security advisory
        </a>{" "}
        form. Include a description, reproduction steps, affected versions, and impact.
      </p>

      <h2>What to expect</h2>
      <ul>
        <li>Acknowledgement of your report as soon as it&apos;s triaged.</li>
        <li>An assessment of severity and affected versions.</li>
        <li>A fix and coordinated disclosure once a patched release is available.</li>
        <li>Credit in the advisory, if you&apos;d like it.</li>
      </ul>

      <h2>Supported versions</h2>
      <p>
        agentty is pre-1.0; security fixes land on the latest release. Always update to the
        newest version (re-run the install one-liner) before reporting — the issue may
        already be fixed.
      </p>

      <h2>Security model at a glance</h2>
      <ul>
        <li><strong>Credentials</strong> live at <code>~/.config/agentty/credentials.json</code>, mode <code>0600</code>, written atomically.</li>
        <li><strong>Shell calls</strong> are sandboxed by default (<code>bwrap</code> / <code>sandbox-exec</code>) — see <a href="/docs/sandboxing">Sandboxing</a>.</li>
        <li><strong>Filesystem tools</strong> are confined to the workspace — see <a href="/docs/workspace">Workspace Boundary</a>.</li>
        <li><strong>TLS</strong> is pinned end-to-end, including through the air-gap SOCKS tunnel.</li>
        <li><strong>Air-gap mode</strong> trusts the remote host with your tokens — review the <a href="/docs/airgap">trust model</a> before using it.</li>
      </ul>
    </div>
  );
}
