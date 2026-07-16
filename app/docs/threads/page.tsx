import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Threads & Persistence",
  description: "Where agentty stores conversations and credentials, and how to manage them.",
  alternates: { canonical: "/docs/threads" },
};

export default function Threads() {
  return (
    <>
      <Breadcrumb title="Threads & Persistence" />
      <h1>Threads &amp; Persistence</h1>
      <p className="lead">
        Every conversation is a thread, stored as a single JSON file you can inspect, back
        up, or delete. Nothing is hidden in a database.
      </p>

      <h2 id="where">Where threads live</h2>
      <p>
        Threads are written to <code>~/.agentty/threads/</code>, one JSON file per thread
        keyed by its id. They&apos;re plain files you can inspect, back up, or delete.
      </p>
      <Code>{`~/.agentty/
├── threads/
│   ├── f24a29c6….json     # one file per conversation
│   └── 86be6534….json
├── settings.json          # provider, model, profile, favourites
└── memory.jsonl           # user-scope remembered facts`}</Code>
      <p>
        Threads are global — the directory is flat and a thread isn&apos;t bound to the
        workspace you created it in, so <kbd>Ctrl+J</kbd> lists every conversation
        regardless of which project you launched from.
      </p>

      <h2 id="manage">Managing threads</h2>
      <p>
        Press <kbd>Ctrl+J</kbd> to open the thread list and switch between past
        conversations. <kbd>Ctrl+N</kbd> starts a new thread. Since each thread is plain
        JSON, you can also <code>rm</code> one or copy it elsewhere as a backup.
      </p>

      <h2 id="atomic">Atomic writes</h2>
      <p>
        Thread and credential writes are atomic: agentty writes to a temp file, calls{" "}
        <code>fsync</code>/<code>_commit</code>, then <code>rename</code>s into place
        (<code>MoveFileExW</code> on Windows). A crash mid-write can&apos;t leave you with a
        half-written, corrupt thread.
      </p>

      <h2 id="credentials">Credentials</h2>
      <p>
        Auth lives separately at <code>~/.config/agentty/credentials.json</code> (mode{" "}
        <code>0600</code>) — see <a href="/docs/authentication">Authentication</a>.
      </p>

      <DocNav current="/docs/threads" />
      <EditThisPage path="app/docs/threads/page.tsx" />
    </>
  );
}
