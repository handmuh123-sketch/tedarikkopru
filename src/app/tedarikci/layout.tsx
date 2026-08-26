import type { ReactNode } from "react";

import { WorkspaceFrame } from "@/components/navigation/workspace-frame";

export default function SupplierLayout({ children }: { children: ReactNode }) {
  return <WorkspaceFrame area="supplier">{children}</WorkspaceFrame>;
}
