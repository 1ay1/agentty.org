import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "SSH Air-gap",
  description: "Run agentty on a host with no direct internet, relaying bytes over SSH.",
};

export default function Airgap() {
  return (
    <>
      <Breadcrumb title="SSH Air-gap" />
      <h1>SSH Air-gap</h1>
      <p className="lead">
        Run agentty on a box that can&apos;t reach the internet directly. Your laptop
        relays the bytes; TLS pins on the real upstreams, so the network in between
        can&apos;t MITM you.
      </p>

      <h2 id="quick">One command</h2>
      <p>From the laptop that <em>does</em> have internet:</p>
      <Code>{`agentty airgap --setup user@airgapped-host    # first time: also copies your credentials
agentty airgap user@airgapped-host            # every time after`}</Code>

      <h2 id="how">How it works</h2>
      <p>
        <code>ssh -R 1080</code> exposes a SOCKS5 proxy on the remote at{" "}
        <code>localhost:1080</code>; connections to it tunnel back over SSH and are dialed
        by your laptop. The remote agentty gets{" "}
        <code>AGENTTY_SOCKS_PROXY=localhost:1080</code> and routes every TCP destination
        through it — chat, OAuth refresh, <code>web_fetch</code>, <code>web_search</code>.
        One env var, no per-host enumeration.
      </p>

      <h2 id="bare">Bare-metal version</h2>
      <p>If you&apos;d rather not use the wrapper:</p>
      <Code>{`ssh -t -R 1080 user@airgapped-host \\
    'AGENTTY_SOCKS_PROXY=localhost:1080 agentty'`}</Code>
      <p>
        Requires OpenSSH ≥ 7.6 on both ends (October 2017 — every distro has it).{" "}
        <code>AGENTTY_AIRGAP_SSH</code> injects extra <code>ssh</code> flags;{" "}
        <code>--remote-agentty PATH</code> if it isn&apos;t on the remote PATH.
      </p>

      <Note type="warn" label="Trust model">
        Airgap doesn&apos;t trust the network between laptop and remote, but it <em>does</em>{" "}
        trust the remote with your tokens — <code>--setup</code> copies{" "}
        <code>credentials.json</code> over at mode <code>600</code>. A compromised remote
        can exfiltrate your Anthropic credentials independent of the tunnel. Use it only on
        hosts you&apos;d already trust with the same secret.
      </Note>

      <DocNav current="/docs/airgap" />
      <EditThisPage path="app/docs/airgap/page.tsx" />
    </>
  );
}
