import Link from "next/link";
import { site } from "@/lib/site";

export function Breadcrumb({ title }: { title: string }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      <span className="sep">/</span>
      <Link href="/docs">Docs</Link>
      <span className="sep">/</span>
      <span className="cur">{title}</span>
    </nav>
  );
}

export function EditThisPage({ path }: { path: string }) {
  return (
    <div className="edit-page">
      <a
        href={`${site.github}/edit/master/${path}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        ✎ Edit this page on GitHub
      </a>
    </div>
  );
}
