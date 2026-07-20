import type { OrganizationMembershipRole } from "@/generated/prisma/enums";

export type OrganizationPermission =
  | "organization:read"
  | "organization:update"
  | "address:manage"
  | "member:manage"
  | "catalog:manage"
  | "catalog:import"
  | "inventory:manage"
  | "document:manage"
  | "verification:submit";

const rolePermissions: Record<OrganizationMembershipRole, ReadonlySet<OrganizationPermission>> = {
  OWNER: new Set([
    "organization:read",
    "organization:update",
    "address:manage",
    "member:manage",
    "catalog:manage",
    "catalog:import",
    "inventory:manage",
    "document:manage",
    "verification:submit",
  ]),
  ORG_ADMIN: new Set([
    "organization:read",
    "organization:update",
    "address:manage",
    "member:manage",
    "catalog:manage",
    "catalog:import",
    "inventory:manage",
    "document:manage",
    "verification:submit",
  ]),
  CATALOG_MANAGER: new Set(["organization:read", "catalog:manage"]),
  ORDER_MANAGER: new Set(["organization:read"]),
  FINANCE: new Set(["organization:read"]),
  WAREHOUSE_OPERATOR: new Set(["organization:read", "inventory:manage"]),
  VIEWER: new Set(["organization:read"]),
};

export function hasOrganizationPermission(
  role: OrganizationMembershipRole,
  permission: OrganizationPermission,
): boolean {
  return rolePermissions[role].has(permission);
}

export function canAssignRole(
  actorRole: OrganizationMembershipRole,
  requestedRole: OrganizationMembershipRole,
): boolean {
  if (actorRole === "OWNER") return true;
  return actorRole === "ORG_ADMIN" && requestedRole !== "OWNER" && requestedRole !== "ORG_ADMIN";
}
