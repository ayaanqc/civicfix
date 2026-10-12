"use client";

import { useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { CATEGORY_META, CATEGORY_ORDER, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { IssueCategory, IssueStatus } from "@/lib/types";
import { CategoryIcon } from "./category-icon";
import { StatusDot } from "./status-pill";

export interface FilterState {
  statuses: Set<IssueStatus>;
  categories: Set<IssueCategory>;
}

interface FilterBarProps {
  filters: FilterState;
  onToggleStatus: (status: IssueStatus) => void;
  onToggleCategory: (category: IssueCategory) => void;
  onClear: () => void;
  /** Compact single-scroll mode for the mobile map overlay. */
  compact?: boolean;
}

function Chip({
  active,
  onClick,
  style,
  className,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${active ? "Remove" : "Add"} filter: ${label}`}
      style={style}
      className={cn(
        "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-all",
        active
          ? "border-transparent text-ink shadow-card"
          : "border-line bg-surface text-ink-2 hover:border-ink-3",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function FilterBar({
  filters,
  onToggleStatus,
  onToggleCategory,
  onClear,
  compact = false,
}: FilterBarProps) {
  const activeCount = filters.statuses.size + filters.categories.size;
  const scrollRef = useRef<HTMLDivElement>(null);

  const statusChips = STATUS_ORDER.map((status) => {
    const active = filters.statuses.has(status);
    const meta = STATUS_META[status];
    return (
      <Chip
        key={status}
        label={meta.label}
        active={active}
        onClick={() => onToggleStatus(status)}
        style={active ? { backgroundColor: meta.soft } : undefined}
        className={active ? "ring-1" : ""}
      >
        <StatusDot status={status} />
        {meta.label}
      </Chip>
    );
  });

  const categoryChips = CATEGORY_ORDER.map((category) => {
    const active = filters.categories.has(category);
    return (
      <Chip
        key={category}
        label={CATEGORY_META[category].label}
        active={active}
        onClick={() => onToggleCategory(category)}
        style={active ? { backgroundColor: "#E0E7FF" } : undefined}
      >
        <CategoryIcon
          category={category}
          size={14}
          className={active ? "text-status-investigating" : "text-ink-3"}
        />
        {CATEGORY_META[category].label}
      </Chip>
    );
  });

  if (compact) {
    return (
      <div className="pointer-events-none">
        <div
          ref={scrollRef}
          className="no-scrollbar pointer-events-auto flex items-center gap-2 overflow-x-auto rounded-2xl border border-line-soft bg-surface/95 p-1.5 shadow-card backdrop-blur"
        >
          <span className="flex h-11 w-8 shrink-0 items-center justify-center text-ink-3">
            <SlidersHorizontal size={15} />
          </span>
          {statusChips}
          <span className="h-5 w-px shrink-0 bg-line-soft" />
          {categoryChips}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="flex h-11 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold text-civic"
            >
              <X size={13} />
              Clear
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5">
        {statusChips}
      </div>
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
        {categoryChips}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex h-11 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold text-civic"
          >
            <X size={13} />
            Clear ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
