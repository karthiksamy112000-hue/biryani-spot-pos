"use client";

import { useActionState } from "react";
import {
  createStaffAccountAction,
  sendStaffPasswordResetAction,
  updateStaffBranchesAction,
  updateStaffStatusAction,
  type StaffAccountActionState,
} from "@/app/actions/staff-accounts";
import type { ManagedStaffAccount } from "@/lib/auth/staff-accounts";
import styles from "./staff-account-management.module.css";

type Branch = { id: string; name: string };

const initialState: StaffAccountActionState = { error: null, success: null };

function ActionMessage({ state }: { state: StaffAccountActionState }) {
  if (state.error) {
    return <p className={styles.error} role="alert">{state.error}</p>;
  }
  if (state.success) {
    return <p className={styles.success} role="status">{state.success}</p>;
  }
  return null;
}

function CreateStaffForm({
  branches,
  invitationReady,
}: {
  branches: Branch[];
  invitationReady: boolean;
}) {
  const [state, formAction, pending] = useActionState(createStaffAccountAction, initialState);

  return (
    <form action={formAction} className={styles.createForm}>
      <div className={styles.formFields}>
        <label>
          <span>Full name</span>
          <input autoComplete="name" maxLength={100} minLength={2} name="fullName" required />
        </label>
        <label>
          <span>Email address</span>
          <input autoComplete="email" name="email" required type="email" />
        </label>
      </div>
      <fieldset className={styles.branchOptions}>
        <legend>Assign active branches</legend>
        {branches.map((branch) => (
          <label className={styles.checkLabel} key={branch.id}>
            <input name="branchIds" type="checkbox" value={branch.id} />
            <span>{branch.name}</span>
          </label>
        ))}
        {branches.length === 0 && <p className={styles.muted}>No active branches are available to assign.</p>}
      </fieldset>
      <ActionMessage state={state} />
      <button className={styles.primaryButton} disabled={!invitationReady || pending || branches.length === 0} type="submit">
        {pending ? "Sending invitation..." : "Create staff account"}
      </button>
      {!invitationReady && (
        <p className={styles.muted}>Account invitations need secure server-side configuration.</p>
      )}
    </form>
  );
}

function StaffAccountRow({
  account,
  branches,
  adminReady,
  invitationReady,
}: {
  account: ManagedStaffAccount;
  branches: Branch[];
  adminReady: boolean;
  invitationReady: boolean;
}) {
  const [branchState, branchAction, branchPending] = useActionState(updateStaffBranchesAction, initialState);
  const [statusState, statusAction, statusPending] = useActionState(updateStaffStatusAction, initialState);
  const [resetState, resetAction, resetPending] = useActionState(sendStaffPasswordResetAction, initialState);
  const assignedIds = new Set(account.branches.map((branch) => branch.id));

  return (
    <article className={styles.staffCard}>
      <div className={styles.staffHeading}>
        <div>
          <h3>{account.fullName}</h3>
          <p>{account.email ?? "Login email unavailable"}</p>
        </div>
        <span className={
          !account.isActive ? styles.inactiveBadge
            : account.emailConfirmed === false ? styles.pendingBadge
              : styles.activeBadge
        }>
          {!account.isActive ? "Inactive" : account.emailConfirmed === false ? "Invite pending" : "Active"}
        </span>
      </div>

      <form action={branchAction} className={styles.assignmentForm}>
        <input name="staffId" type="hidden" value={account.id} />
        <fieldset className={styles.branchOptions} disabled={!account.isActive || branches.length === 0}>
          <legend>Assigned branches</legend>
          {branches.map((branch) => (
            <label className={styles.checkLabel} key={branch.id}>
              <input
                defaultChecked={assignedIds.has(branch.id)}
                name="branchIds"
                type="checkbox"
                value={branch.id}
              />
              <span>{branch.name}</span>
            </label>
          ))}
          {account.branches.some((branch) => !branches.some((active) => active.id === branch.id)) && (
            <p className={styles.muted}>This account has an assignment to an inactive branch.</p>
          )}
        </fieldset>
        <ActionMessage state={branchState} />
        <button className={styles.secondaryButton} disabled={!account.isActive || branchPending || branches.length === 0} type="submit">
          {branchPending ? "Saving..." : "Save branch assignments"}
        </button>
      </form>

      <div className={styles.staffActions}>
        <form action={statusAction}>
          <input name="staffId" type="hidden" value={account.id} />
          <input name="isActive" type="hidden" value={String(!account.isActive)} />
          <ActionMessage state={statusState} />
          <button className={account.isActive ? styles.dangerButton : styles.secondaryButton} disabled={!adminReady || statusPending} type="submit">
            {statusPending ? "Updating..." : account.isActive ? "Deactivate account" : "Activate account"}
          </button>
        </form>
        <form action={resetAction}>
          <input name="staffId" type="hidden" value={account.id} />
          <ActionMessage state={resetState} />
          <button
            className={styles.secondaryButton}
            disabled={!invitationReady || !account.isActive || account.emailConfirmed === false || resetPending}
            type="submit"
          >
            {resetPending ? "Sending..." : "Send password reset"}
          </button>
        </form>
      </div>
    </article>
  );
}

export function StaffAccountManagement({
  accounts,
  branches,
  adminReady,
  invitationReady,
}: {
  accounts: ManagedStaffAccount[];
  branches: Branch[];
  adminReady: boolean;
  invitationReady: boolean;
}) {
  return (
    <section className={styles.section} aria-labelledby="staff-management-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>TEAM ACCESS</p>
          <h2 id="staff-management-title">Staff accounts</h2>
        </div>
        <span>{accounts.length} {accounts.length === 1 ? "account" : "accounts"}</span>
      </div>

      {(!adminReady || !invitationReady) && (
        <p className={styles.setupNotice} role="status">
          Login email lookup and activation controls require a server-side Supabase Admin key. Invitations and password resets also need the app URL and Supabase Auth email redirect setup.
        </p>
      )}

      <div className={styles.managementGrid}>
        <div className={styles.createPanel}>
          <p className={styles.panelEyebrow}>NEW TEAM MEMBER</p>
          <h3>Create a staff account</h3>
          <p className={styles.description}>Send a secure invitation and assign at least one active branch.</p>
          <CreateStaffForm branches={branches} invitationReady={invitationReady} />
        </div>

        <div className={styles.accountList}>
          {accounts.length > 0 ? accounts.map((account) => (
            <StaffAccountRow
              account={account}
              adminReady={adminReady}
              branches={branches}
              invitationReady={invitationReady}
              key={account.id}
            />
          )) : (
            <p className={styles.empty}>No Staff accounts yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
