export type PortalRole = "owner" | "staff";

export type AuthenticatedPrincipal = {
  id: string;
  displayName: string;
  role: PortalRole;
  branches: Array<{ id: string; name: string }>;
};