import Link from "next/link";

type PortalPlaceholderProps = {
  title: string;
  audience: string;
  description: string;
};

export function PortalPlaceholder({
  title,
  audience,
  description,
}: PortalPlaceholderProps) {
  return (
    <main className="placeholder-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Back to Biryani Spot portal selection">
          <span className="brand-monogram" aria-hidden="true">BS</span>
          <span className="brand-label">
            <span>Biryani Spot</span>
            <span>Operations</span>
          </span>
        </Link>
        <span className="topbar-label">{audience} portal</span>
      </header>

      <section className="placeholder-main" aria-labelledby="placeholder-title">
        <p className="eyebrow">PORTAL RESERVED</p>
        <h1 id="placeholder-title">{title}</h1>
        <p>{description}</p>
        <Link className="back-link" href="/">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M15.5 10h-11m4 4-4-4 4-4" />
          </svg>
          Back to portal selection
        </Link>
      </section>
    </main>
  );
}