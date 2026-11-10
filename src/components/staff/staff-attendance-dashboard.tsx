import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { AuthenticatedPrincipal } from "@/lib/auth/roles";
import styles from "./staff-attendance-dashboard.module.css";

type IconName = "chef" | "calendar" | "location" | "clock" | "wallet" | "history" | "home" | "arrow";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    chef: <><path d="M6.5 13.5a4.5 4.5 0 0 1-.7-8.5 5.2 5.2 0 0 1 9.7-1 4.4 4.4 0 0 1 2 8.3v5.2h-11z" /><path d="M6.5 16h11M9 19h6" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" /></>,
    location: <><path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
    wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 9V6a2 2 0 0 1 2-2h12M16 13h5v4h-5a2 2 0 0 1 0-4Z" /></>,
    history: <><path d="M4.5 9A8 8 0 1 1 4 14M4 4.5V9h4.5" /><path d="M12 7.5V12l3 2" /></>,
    home: <><path d="m3.5 10 8.5-7 8.5 7M5.5 9v10.5h13V9M10 19.5v-6h4v6" /></>,
    arrow: <><path d="M4 12h16M14 6l6 6-6 6" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function StaffAttendanceDashboard({ principal }: { principal: AuthenticatedPrincipal }) {
  const today = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="Briyani Spot portal selection">
            <span className={styles.brandMark}><Icon name="chef" /></span>
            <span className={styles.brandText}><strong>Briyani Spot</strong><span>STAFF WORKSPACE</span></span>
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className={styles.main} id="attendance">
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>YOUR WORKSPACE <span>/</span> ATTENDANCE</p>
            <h1>Attendance</h1>
            <p>Your time, all in one place.</p>
          </div>
          <span className={styles.headingBadge}>STAFF PORTAL</span>
        </div>

        <section className={styles.welcome} aria-labelledby="welcome-title">
          <div className={styles.welcomeCopy}>
            <p className={styles.eyebrow}>A LITTLE CARE GOES A LONG WAY</p>
            <h2 id="welcome-title">Welcome, <span>{principal.displayName}</span></h2>
            <p>Here&apos;s your attendance workspace for today.</p>
          </div>
          <div className={styles.welcomeDetails}>
            <div className={styles.detail}>
              <span className={styles.detailIcon}><Icon name="location" /></span>
              <div><span>ASSIGNED {principal.branches.length === 1 ? "BRANCH" : "BRANCHES"}</span><strong>{principal.branches.map((branch) => branch.name).join(", ")}</strong></div>
            </div>
            <div className={styles.detail}>
              <span className={styles.detailIcon}><Icon name="calendar" /></span>
              <div><span>TODAY · INDIA TIME</span><strong>{today}</strong></div>
            </div>
          </div>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.shiftCard} aria-labelledby="shift-title">
            <div className={styles.cardHeader}>
              <div><p className={styles.eyebrow}>YOUR ATTENDANCE</p><h2 id="shift-title">Your shift</h2></div>
              <span className={styles.pendingBadge}><span /> Setup pending</span>
            </div>
            <p className={styles.cardDescription}>Your shift controls will be available once payroll setup is complete.</p>
            <div className={styles.timerPanel}>
              <div className={styles.timerLabel}><Icon name="clock" /> LIVE SHIFT TIMER</div>
              <div className={styles.timer} aria-label="Shift timer unavailable">--:--:--</div>
              <p>Timer unavailable until setup is complete</p>
            </div>
            <div className={styles.actions} aria-describedby="setup-message">
              <button className={styles.punchIn} type="button" disabled><Icon name="clock" /> Punch In</button>
              <button className={styles.punchOut} type="button" disabled><Icon name="arrow" /> Punch Out</button>
            </div>
            <p className={styles.setupMessage} id="setup-message">Setup pending · Punch In and Punch Out are disabled.</p>
          </section>

          <section className={styles.overview} aria-labelledby="overview-title">
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>AT A GLANCE</p><h2 id="overview-title">Your overview</h2></div></div>
            <div className={styles.metrics}>
              <article className={styles.metric}>
                <span className={styles.metricIcon}><Icon name="clock" /></span>
                <p>Working hours</p>
                <strong aria-label="Working hours unavailable">—</strong>
                <span>Completed shifts</span>
              </article>
              <article className={styles.metric}>
                <span className={styles.metricIcon}><Icon name="wallet" /></span>
                <p>Earned salary</p>
                <strong aria-label="Earned salary unavailable">—</strong>
                <span>Completed shifts only</span>
              </article>
            </div>
            <div className={styles.rateNote}><span className={styles.rateIcon}>₹</span><div><strong>₹50 per hour</strong><p>Salary is based on actual time worked and rounded to paise. Only completed shifts count.</p></div></div>
          </section>
        </div>

        <section className={styles.history} id="history" aria-labelledby="history-title">
          <div className={styles.cardHeader}>
            <div><p className={styles.eyebrow}>YOUR RECORDS</p><h2 id="history-title">Attendance history</h2></div>
            <span className={styles.historyIcon}><Icon name="history" /></span>
          </div>
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><Icon name="calendar" /></span>
            <div><strong>Attendance history is unavailable</strong><p>Setup is pending. Your records will appear here once payroll is activated.</p></div>
          </div>
        </section>
        <p className={styles.footer}>BRIYANI SPOT <span>·</span> STAFF WORKSPACE</p>
      </main>

      <nav className={styles.bottomNav} aria-label="Staff navigation">
        <div className={styles.navInner}>
          <Link href="/" className={styles.navItem}><Icon name="home" /><span>Portal</span></Link>
          <a href="#attendance" className={`${styles.navItem} ${styles.navActive}`} aria-current="page"><Icon name="clock" /><span>Attendance</span></a>
          <a href="#history" className={styles.navItem}><Icon name="history" /><span>History</span></a>
        </div>
      </nav>
    </div>
  );
}
