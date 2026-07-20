import { describe, expect, it } from "vitest";

import {
  canAssignRole,
  hasOrganizationPermission,
} from "@/modules/organizations/domain/permissions";

describe("organization RBAC", () => {
  it("viewer ve operasyon rollerine yönetim yetkisi vermez", () => {
    expect(hasOrganizationPermission("VIEWER", "organization:read")).toBe(true);
    expect(hasOrganizationPermission("VIEWER", "organization:update")).toBe(false);
    expect(hasOrganizationPermission("FINANCE", "member:manage")).toBe(false);
    expect(hasOrganizationPermission("WAREHOUSE_OPERATOR", "document:manage")).toBe(false);
  });

  it("ORG_ADMIN rolünün owner veya başka admin atamasını engeller", () => {
    expect(canAssignRole("ORG_ADMIN", "OWNER")).toBe(false);
    expect(canAssignRole("ORG_ADMIN", "ORG_ADMIN")).toBe(false);
    expect(canAssignRole("ORG_ADMIN", "VIEWER")).toBe(true);
    expect(canAssignRole("OWNER", "ORG_ADMIN")).toBe(true);
  });
});
