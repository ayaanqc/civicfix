"use client";

import Link from "next/link";
import { MapPin, ShieldCheck } from "lucide-react";

interface AppHeaderProps {
  openCount: number;
  resolvedCount: number;
}

export function AppHeader({ openCount, resolvedCount }: AppHeaderProps) {
  return (
    <header className="relative z-[800] flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
      <Link
        href="/"
        className="flex min-h-11 items-center gap-2.5"
        aria-label="CivicFix home"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-civic text-white shadow-card">
          <MapPin size={18} strokeWidth={2.4} />
        </span>
        <span className="text-lg font-semibold tracking-tight text-ink">
          CivicFix
        </span>
        <span className="hidden text-xs font-medium text-ink-3 md:inline">
          Report. Track. Resolve.
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <span
          className="flex min-h-11 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-ink-2 sm:px-3"
          title="Open reports in the loaded map area"
        >
          <span className="h-2 w-2 rounded-full bg-status-pending" />
          {openCount} open
        </span>
        <span
          className="hidden min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-2 sm:flex"
          title="Resolved reports in the loaded map area"
        >
          <span className="h-2 w-2 rounded-full bg-status-resolved" />
          {resolvedCount} fixed
        </span>
        <Link
          href="/admin"
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink-2 transition-colors hover:border-civic hover:text-civic sm:px-4"
        >
          <ShieldCheck size={15} />
          <span className="hidden sm:inline">Staff</span>
        </Link>
      </div>
    </header>
  );
}
