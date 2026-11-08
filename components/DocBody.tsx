import { Fragment } from "react";
import { ReleaseTable } from "./ReleaseTable";
import { DocEnhance } from "./DocEnhance";

// Server component: the docs HTML is complete at build time — highlighted code,
// copy buttons, heading anchors, and directive blocks (the release table is
// rendered right here, not hydrated later), so nothing shifts after load.
// DocEnhance only attaches one delegated click handler.
const DIRECTIVES: Record<string, () => React.ReactNode> = {
  "release-table": () => <ReleaseTable />,
};

export function DocBody({ html }: { html: string }) {
  const parts = html.split(/<div data-directive="([a-z-]+)"><\/div>/);
  return (
    <div className="doc-body">
      {parts.map((p, i) =>
        i % 2 === 0 ? (
          p && <div key={i} className="doc-chunk" dangerouslySetInnerHTML={{ __html: p }} />
        ) : (
          <Fragment key={i}>{DIRECTIVES[p]?.()}</Fragment>
        ),
      )}
      <DocEnhance />
    </div>
  );
}
