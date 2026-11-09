import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAuthenticatedPrincipal } from "@/lib/auth/dal";
import type { PortalRole } from "@/lib/auth/roles";
import { SignOutButton } from "./sign-out-button";

type ProtectedPortalProps = {
  role: PortalRole;
};

export async function ProtectedPortal({ role }: ProtectedPortalProps) {
  await connection();
  const principal = await getAuthenticatedPrincipal();

  if (!principal) {
    redirect(role === "owner" ? "/owner/login" : "/staff/login");
  }

  if (principal.role !== role) {
    redirect(principal.role === "owner" ? "/owner" : "/staff");
  }

  const title = role === "owner" ? "Owner Management" : "Staff POS";

  return (
    <main className="placeholder-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Biryani Spot portal selection">
          <span className="brand-monogram" aria-hidden="true">BS</span>
          <span className="brand-label">
            <span>Biryani Spot</span>
            <span>Operations</span>
          </span>
        </Link>
        <SignOutButton />
      </header>

      <section className="workspace-main" aria-labelledby="workspace-title">
        <p className="eyebrow">VERIFIED {role.toUpperCase()} SESSION</p>
        <h1 id="workspace-title">{title}</h1>
        <p className="workspace-greeting">Signed in as {principal.displayName}</p>
        <div className="branch-section">
          <h2>{role === "owner" ? "Active branches" : "Assigned branch"}</h2>
          <ul className="branch-list">
            {principal.branches.map((branch) => (
              <li key={branch.id}>
                <span className="branch-indicator" aria-hidden="true" />
                {branch.name}
              </li>
            ))}
          </ul>
        </div>
        <p className="workspace-note">
          Secure access is ready. POS and management workflows will be added in later phases.
        </p>
      </section>
    </main>
  );
}