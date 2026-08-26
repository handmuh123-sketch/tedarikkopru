import type { ReactNode } from "react";

import { WorkspaceFrame } from "@/components/navigation/workspace-frame";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return <WorkspaceFrame area="buyer">{children}</WorkspaceFrame>;
}
