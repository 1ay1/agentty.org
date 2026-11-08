import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <p className="kicker">404</p>
      <h1>Page not found.</h1>
      <p className="lead">
        That page doesn&apos;t exist. <Link href="/">Home</Link> · <Link href="/docs/">Docs</Link>
      </p>
    </div>
  );
}
