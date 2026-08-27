import type { ReactNode } from "react";

import { WorkspaceNavigation } from "@/components/navigation/workspace-navigation";
import type { WorkspaceArea } from "@/components/navigation/navigation-model";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";

export async function WorkspaceFrame({
  area,
  children,
}: {
  area: WorkspaceArea;
  children: ReactNode;
}) {
  const { user } = await requirePageUser();
  const memberships = await database.organizationMembership.findMany({
    where: { userId: user.id, status: "ACTIVE", organization: { status: { not: "ARCHIVED" } } },
    select: {
      id: true,
      role: true,
      organization: {
        select: { tradeName: true, type: true, verificationStatus: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="workspace-shell">
      <WorkspaceNavigation
        area={area}
        memberships={memberships.map((membership) => ({
          id: membership.id,
          tradeName: membership.organization.tradeName,
          type: membership.organization.type,
          role: membership.role,
          verificationStatus: membership.organization.verificationStatus,
        }))}
        platformRole={user.platformRole}
        userName={user.name}
      />
      <div className="workspace-content">{children}</div>
    </div>
  );
}
