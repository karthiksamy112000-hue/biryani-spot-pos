import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import styles from "./staff-account-required.module.css";

export function StaffAccountRequired() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Briyani Spot portal selection">
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 13.5a4.5 4.5 0 0 1-.7-8.5 5.2 5.2 0 0 1 9.7-1 4.4 4.4 0 0 1 2 8.3v5.2h-11z" />
              <path d="M6.5 16h11M9 19h6" />
            </svg>
          </span>
          <span className={styles.brandText}><strong>Briyani Spot</strong><span>STAFF WORKSPACE</span></span>
        </Link>
      </header>

      <div className={styles.content}>
        <section className={styles.card} aria-labelledby="staff-account-title">
          <span className={styles.icon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5.5 20v-1a6.5 6.5 0 0 1 13 0v1M17 7.5h4M19 5.5v4" />
            </svg>
          </span>
          <p className={styles.eyebrow}>STAFF PORTAL</p>
          <h1 id="staff-account-title">Staff Account Required</h1>
          <p className={styles.description}>
            You&apos;re currently signed in as an owner. To access the staff portal, sign out and use a staff account.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/owner">Return to Owner Management</Link>
            <SignOutButton
              className={styles.secondary}
              destination="/staff/login"
              label="Sign out to use Staff Account"
              showError
            />
          </div>
        </section>
      </div>
    </main>
  );
}
