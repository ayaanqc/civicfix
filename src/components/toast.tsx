"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastItem {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
}

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

const ACCENT = {
  success: "text-status-resolved",
  error: "text-status-pending",
  info: "text-civic",
} as const;

export function Toaster({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-3 z-[1300] flex w-[min(92vw,400px)] -translate-x-1/2 flex-col gap-2"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind];
        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink shadow-card",
              "animate-[cf-toast-in_.25s_ease-out]",
            )}
          >
            <Icon className={cn("h-4.5 w-4.5 shrink-0", ACCENT[toast.kind])} size={18} />
            <span className="leading-snug">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
