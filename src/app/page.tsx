import Link from "next/link";

const portals = [
  {
    id: "staff",
    title: "Staff POS",
    description: "Dine-in, takeaway and parcel billing, with sales history.",
    href: "/staff",
    action: "Open staff portal",
    label: "SERVICE & BILLING",
  },
  {
    id: "owner",
    title: "Owner Management",
    description: "Branch operations, staff access, payments and reports.",
    href: "/owner",
    action: "Open owner portal",
    label: "BUSINESS OVERSIGHT",
  },
];

export default function Home() {
  return (
    <main className="portal-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Biryani Spot portal selection">
          <span className="brand-monogram" aria-hidden="true">BS</span>
          <span className="brand-label">
            <span>Biryani Spot</span>
            <span>Operations</span>
          </span>
        </Link>
        <span className="topbar-label">POINT OF SALE <span aria-hidden="true">/</span> MANAGEMENT</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <div className="intro-copy">
          <p className="eyebrow">OPERATIONS PORTAL</p>
          <h1 id="page-title">Biryani Spot</h1>
          <p className="intro-description">Staff POS <span aria-hidden="true">&amp;</span> Owner Management</p>
        </div>

        <div className="pos-illustration" role="img" aria-label="Biryani Spot point of sale terminal illustration">
          <div className="terminal-device">
            <div className="terminal-topbar">
              <span className="terminal-light" />
              <span className="terminal-rule" />
            </div>
            <div className="terminal-screen">
              <span className="screen-monogram">BS</span>
              <span className="screen-lines"><i /><i /><i /></span>
              <span className="screen-total" />
            </div>
            <div className="terminal-base"><span /></div>
          </div>
        </div>
      </section>

      <section className="portal-section" aria-labelledby="portal-title">
        <div className="section-heading">
          <h2 id="portal-title">Select portal</h2>
          <span className="section-aside">Choose your workspace</span>
        </div>

        <div className="portal-grid">
          {portals.map((portal) => (
            <Link
              className={`portal-card portal-card--${portal.id}`}
              href={portal.href}
              key={portal.id}
            >
              <span className="portal-icon" aria-hidden="true">
                {portal.id === "staff" ? (
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M8 5.5h8M9 3.75h6a1 1 0 0 1 1 1v2.5H8v-2.5a1 1 0 0 1 1-1Z" />
                    <path d="M7 5.75H5.75A1.75 1.75 0 0 0 4 7.5v11.75A1.75 1.75 0 0 0 5.75 21h12.5A1.75 1.75 0 0 0 20 19.25V7.5a1.75 1.75 0 0 0-1.75-1.75H17M8 12h8M8 16h5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 20V9.5L12 4l8 5.5V20M2.75 20h18.5M8 20v-6h8v6M8 10h.01M12 10h.01M16 10h.01" />
                  </svg>
                )}
              </span>
              <div className="portal-content">
                <span className="portal-label">{portal.label}</span>
                <h3>{portal.title}</h3>
                <p>{portal.description}</p>
              </div>
              <span className="portal-action">
                {portal.action}
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4.5 10h10m-4-4 4 4-4 4" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="footer">
        <span>Biryani Spot</span>
        <span>Staff POS <i /> Owner Management</span>
      </footer>
    </main>
  );
}
