import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { StaffAccountManagement } from "@/components/owner/staff-account-management";
import type { StaffManagementData } from "@/lib/auth/staff-accounts";
import type { AuthenticatedPrincipal } from "@/lib/auth/roles";
import styles from "./owner-branch-workspace.module.css";

type Branch = AuthenticatedPrincipal["branches"][number];

export function OwnerBranchWorkspace({
  principal,
  selectedBranch,
  staffManagement,
}: {
  principal: AuthenticatedPrincipal;
  selectedBranch?: Branch;
  staffManagement?: StaffManagementData;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="Briyani Spot portal selection">
            <span className={styles.brandMark} aria-hidden="true">BS</span>
            <span className={styles.brandText}><strong>Briyani Spot</strong><span>OWNER WORKSPACE</span></span>
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className={styles.content}>
        {selectedBranch ? (
          <section aria-labelledby="branch-title">
            <Link href="/owner" className={styles.backLink}><span aria-hidden="true">←</span> All branches</Link>
            <p className={styles.eyebrow}>OWNER MANAGEMENT / BRANCH OVERVIEW</p>
            <h1 id="branch-title" className={styles.title}>{selectedBranch.name}</h1>
            <p className={styles.intro}>Selected branch overview</p>
            <div className={styles.overview}>
              <span className={styles.icon} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20V9l8-5 8 5v11M3 20h18M9 20v-6h6v6" />
                </svg>
              </span>
              <div>
                <p className={styles.eyebrow}>BRANCH WORKSPACE</p>
                <h2>{selectedBranch.name}</h2>
                <p>This overview is ready. Branch management tools are not available yet.</p>
              </div>
            </div>
          </section>
        ) : (
          <section aria-labelledby="workspace-title">
            <p className={styles.eyebrow}>VERIFIED OWNER SESSION</p>
            <h1 id="workspace-title" className={styles.title}>Owner Management</h1>
            <p className={styles.intro}>Signed in as {principal.displayName}</p>
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>YOUR WORKSPACE</p><h2>Active branches</h2></div>
              <span>Select a branch</span>
            </div>
            {principal.branches.length > 0 ? (
              <ul className={styles.branchGrid}>
                {principal.branches.map((branch) => (
                  <li key={branch.id}>
                    <Link className={styles.branchCard} href={`/owner/branches/${encodeURIComponent(branch.id)}`}>
                      <span className={styles.cardIcon} aria-hidden="true">⌂</span>
                      <span className={styles.cardName}>{branch.name}</span>
                      <span className={styles.cardAction}>Open branch overview <span aria-hidden="true">→</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>No active branches are available.</p>
            )}
            {staffManagement && (
              <StaffAccountManagement
                accounts={staffManagement.accounts}
                adminReady={staffManagement.adminReady}
                branches={principal.branches}
                invitationReady={staffManagement.invitationReady}
              />
            )}
            <p className={styles.note}>Additional branch management workflows will be added in a later phase.</p>
          </section>
        )}
      </div>
    </main>
  );
}
