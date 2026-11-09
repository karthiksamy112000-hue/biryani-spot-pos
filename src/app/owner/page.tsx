import { Suspense } from "react";
import { ProtectedPortal } from "@/components/auth/protected-portal";

export default function OwnerPortalPage() {
  return (
    <Suspense fallback={<main className="placeholder-shell" />}>
      <ProtectedPortal role="owner" />
    </Suspense>
  );
}