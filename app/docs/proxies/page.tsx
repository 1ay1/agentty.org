import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Corporate Proxies",
  description: "Make agentty work behind TLS-terminating forward proxies.",
  alternates: { canonical: "/docs/proxies" },
};

export default function Proxies() {
  return (
    <>
      <Breadcrumb title="Corporate Proxies" />
      <h1>Corporate Proxies</h1>
      <p className="lead">
        SOCKS keeps TLS end-to-end, so cert verification works untouched. A forward proxy
        that re-encrypts with its own certificate is a different story.
      </p>

      <h2 id="socks">SOCKS proxies — nothing to do</h2>
      <p>
        Because SOCKS doesn&apos;t terminate TLS, agentty&apos;s certificate verification
        works exactly as it does on a direct connection. This is also why{" "}
        <a href="/docs/airgap">air-gap mode</a> is safe over an untrusted network.
      </p>

      <h2 id="mitm">TLS-terminating proxies (Zscaler, Bluecoat, mitmproxy)</h2>
      <p>
        If your network routes through a forward proxy that re-encrypts traffic with its
        own CA, install that CA into the system trust store — agentty picks up system roots
        at startup:
      </p>
      <Code>{`# Debian / Ubuntu
sudo cp corp-proxy-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates

# Fedora / RHEL
sudo cp corp-proxy-ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust`}</Code>

      <h2 id="last-resort">Last resort</h2>
      <p>If you genuinely can&apos;t install the CA, you can disable peer verification:</p>
      <Code>{`AGENTTY_INSECURE=1 agentty`}</Code>
      <Note type="warn">
        <code>AGENTTY_INSECURE=1</code> skips peer verification entirely — anyone on the
        path can impersonate the API. Don&apos;t ship that to anyone you care about; use it
        only as a temporary local workaround.
      </Note>

      <DocNav current="/docs/proxies" />
      <EditThisPage path="app/docs/proxies/page.tsx" />
    </>
  );
}
