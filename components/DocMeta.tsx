import Link from "next/link";

export function Breadcrumb({ title }: { title: string }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link href="/" aria-label="Home">~</Link>
      <span className="sep">/</span>
      <Link href="/docs/">Docs</Link>
      <span className="sep">/</span>
      <span className="cur">{title}</span>
    </nav>
  );
}

export function EditThisPage({ path, repo = "agentty.org" }: { path: string; repo?: string }) {
  // docs pages live in the agentty repo (repo="agentty"); everything else in the
  // site repo ("agentty.org"). Both edit on the master branch.
  const base =
    repo === "agentty"
      ? "https://github.com/agentty-org/agentty"
      : "https://github.com/1ay1/agentty.org";
  return (
    <div className="edit-page">
      <a
        href={`${base}/edit/master/${path}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        edit this page on github
      </a>
    </div>
  );
}
