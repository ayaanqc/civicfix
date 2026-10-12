import { STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { IssueStatus } from "@/lib/types";

export function StatusDot({
  status,
  className,
}: {
  status: IssueStatus;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2 w-2 rounded-full", className)}
      style={{ backgroundColor: STATUS_META[status].color }}
    />
  );
}

export function StatusPill({
  status,
  className,
}: {
  status: IssueStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-tight",
        className,
      )}
      style={{ backgroundColor: meta.soft, color: meta.color }}
    >
      <StatusDot status={status} />
      {meta.label}
    </span>
  );
}
