import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getAuthenticatedPrincipal } from "@/lib/auth/dal";
import type { PortalRole } from "@/lib/auth/roles";
import { OwnerBranchWorkspace } from "@/components/owner/owner-branch-workspace";
import { getStaffManagementData } from "@/lib/auth/staff-accounts";
import { StaffAttendanceDashboard } from "@/components/staff/staff-attendance-dashboard";
import { StaffAccountRequired } from "./staff-account-required";

type ProtectedPortalProps = {
  role: PortalRole;
  branchParams?: Promise<{ branchId: string }>;
};

export async function ProtectedPortal({ role, branchParams }: ProtectedPortalProps) {
  await connection();
  const principal = await getAuthenticatedPrincipal();

  if (!principal) {
    redirect(role === "owner" ? "/owner/login" : "/staff/login");
  }

  if (principal.role !== role) {
    if (role === "staff" && principal.role === "owner") {
      return <StaffAccountRequired />;
    }

    redirect(principal.role === "owner" ? "/owner" : "/staff");
  }

  if (role === "staff") {
    return <StaffAttendanceDashboard principal={principal} />;
  }

  if (branchParams) {
    const { branchId } = await branchParams;
    const selectedBranch = principal.branches.find((branch) => branch.id === branchId);
    if (!selectedBranch) {
      notFound();
    }

    return <OwnerBranchWorkspace principal={principal} selectedBranch={selectedBranch} />;
  }

  const staffManagement = await getStaffManagementData(principal);
  return <OwnerBranchWorkspace principal={principal} staffManagement={staffManagement} />;
}