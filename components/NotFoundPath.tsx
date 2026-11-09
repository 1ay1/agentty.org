"use client";

import { useEffect, useState } from "react";

// The path you asked for. The 404 page is static, so it is filled in after load.
export function NotFoundPath() {
  const [path, setPath] = useState("…");
  useEffect(() => {
    setPath(decodeURIComponent(location.pathname).replace(/\/$/, "") || "/");
  }, []);
  return <span className="notfound-path">{path}</span>;
}
