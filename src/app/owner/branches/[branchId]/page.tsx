import { Suspense } from "react";
import { ProtectedPortal } from "@/components/auth/protected-portal";

export default function OwnerBranchPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  return (
    <Suspense fallback={<main className="placeholder-shell" />}>
      <ProtectedPortal role="owner" branchParams={params} />
    </Suspense>
  );
}
