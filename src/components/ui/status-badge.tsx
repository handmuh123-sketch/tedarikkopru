import type { ReactNode } from "react";

export type StatusBadgeTone =
  "ready" | "missing" | "review" | "approved" | "test" | "error" | "disabled";

export function StatusBadge({
  children,
  label,
  tone,
}: {
  children?: ReactNode;
  label?: string;
  tone: StatusBadgeTone;
}) {
  return <span className={`status-badge status-badge--${tone}`}>{children ?? label}</span>;
}
