import Link from "next/link";
import { docsNav } from "@/lib/site";

// Flattened ordered list for prev/next navigation
const flat = docsNav.flatMap((s) => s.items);

export function DocNav({ current }: { current: string }) {
  const idx = flat.findIndex((i) => i.href === current);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;
  return (
    <div className="docnav">
      {prev ? (
        <Link href={prev.href}>
          <span className="dir">← Previous</span>
          {prev.title}
        </Link>
      ) : (
        <span style={{ flex: 1 }} />
      )}
      {next ? (
        <Link href={next.href} className="next">
          <span className="dir">Next →</span>
          {next.title}
        </Link>
      ) : (
        <span style={{ flex: 1 }} />
      )}
    </div>
  );
}
