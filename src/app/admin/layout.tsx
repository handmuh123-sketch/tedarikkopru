import type { ReactNode } from "react";

import { WorkspaceFrame } from "@/components/navigation/workspace-frame";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <WorkspaceFrame area="admin">{children}</WorkspaceFrame>;
}
