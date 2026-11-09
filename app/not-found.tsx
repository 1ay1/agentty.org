import Link from "next/link";
import { NotFoundPath } from "@/components/NotFoundPath";

// A missing page reads like the shell telling you so.
export default function NotFound() {
  return (
    <div className="page notfound">
      <pre className="notfound-shell">
        <span className="notfound-prompt">$</span> cd <NotFoundPath />
        {"\n"}
        cd: no such file or directory: <NotFoundPath />
        <NotFoundPath suggest />
      </pre>
      <p className="notfound-try">try</p>
      <ul className="notfound-list">
        <li><Link href="/">cd ~</Link><span>home</span></li>
        <li><Link href="/docs/">ls docs/</Link><span>the manual</span></li>
        <li><Link href="/docs/installation/">install</Link><span>one line, any platform</span></li>
        <li><span className="notfound-key"><kbd>/</kbd></span><span>search the site</span></li>
      </ul>
    </div>
  );
}
