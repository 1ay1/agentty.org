import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <Link className="brand" href="/">
              <span className="brand-mark">▌</span>
              <span className="brand-name">agentty</span>
            </Link>
            <p className="foot-blurb">
              Blazing-fast Claude in your terminal. A native C++26 coding agent —
              one static binary, sandboxed by default.
            </p>
          </div>
          <div>
            <h4>Docs</h4>
            <Link href="/docs">Introduction</Link>
            <Link href="/docs/installation">Installation</Link>
            <Link href="/docs/quick-start">Quick Start</Link>
            <Link href="/docs/keybindings">Keybindings</Link>
            <Link href="/docs/airgap">SSH Air-gap</Link>
          </div>
          <div>
            <h4>Project</h4>
            <a href={site.github} target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href={site.releasesLatest} target="_blank" rel="noopener noreferrer">Releases</a>
            <Link href="/contributing">Contributing</Link>
            <Link href="/security">Security</Link>
          </div>
          <div>
            <h4>Community</h4>
            <Link href="/community">Get Involved</Link>
            <a href={site.issues} target="_blank" rel="noopener noreferrer">Report a Bug</a>
            <Link href="/acknowledgements">Acknowledgements</Link>
            <Link href="/code-of-conduct">Code of Conduct</Link>
            <Link href="/license">License</Link>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {year} agentty contributors · {site.license} Licensed</span>
          <span>Built with C++26 · Powered by Claude</span>
        </div>
      </div>
    </footer>
  );
}
