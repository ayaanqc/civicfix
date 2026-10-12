"use client";

import { MapPinOff, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IssueCategory, IssueStatus, ReportPayload } from "@/lib/types";
import { FilterBar, type FilterState } from "./filter-bar";
import { ReportCard } from "./report-card";

export type SortMode = "newest" | "verified";

interface FeedPanelProps {
  reports: ReportPayload[];
  sort: SortMode;
  onSortChange: (sort: SortMode) => void;
  filters: FilterState;
  onToggleStatus: (status: IssueStatus) => void;
  onToggleCategory: (category: IssueCategory) => void;
  onClearFilters: () => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  activeId: string | null;
  confirmedIds: Set<string>;
  onOpen: (id: string) => void;
  onConfirm: (id: string) => void;
  withFilters: boolean;
}

function SkeletonCards() {
  return (
    <div className="flex flex-col">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 border-b border-line-soft p-3">
          <span className="h-[76px] w-[76px] animate-pulse rounded-xl bg-line-soft" />
          <div className="flex flex-1 flex-col gap-2">
            <span className="h-3.5 w-3/4 animate-pulse rounded bg-line-soft" />
            <span className="h-5 w-1/2 animate-pulse rounded-full bg-line-soft" />
            <span className="h-3 w-2/3 animate-pulse rounded bg-line-soft" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedPanel({
  reports,
  sort,
  onSortChange,
  filters,
  onToggleStatus,
  onToggleCategory,
  onClearFilters,
  loading,
  error,
  onRetry,
  activeId,
  confirmedIds,
  onOpen,
  onConfirm,
  withFilters,
}: FeedPanelProps) {
  const hasFilters =
    filters.statuses.size + filters.categories.size > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 px-4 pb-2.5 pt-3">
        <h2 className="text-sm font-semibold text-ink">Reports nearby</h2>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-2">
          {reports.length}
        </span>
        <div
          role="tablist"
          aria-label="Sort feed"
          className="ml-auto flex items-center rounded-full border border-line bg-surface p-0.5"
        >
          {(["newest", "verified"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={sort === mode}
              onClick={() => onSortChange(mode)}
              className={cn(
                "min-h-9 rounded-full px-3 text-[11px] font-semibold transition-colors",
                sort === mode ? "bg-civic text-white" : "text-ink-2 hover:text-ink",
              )}
            >
              {mode === "newest" ? "Newest" : "Most verified"}
            </button>
          ))}
        </div>
      </div>

      {withFilters && (
        <div className="border-b border-line-soft px-4 pb-3">
          <FilterBar
            filters={filters}
            onToggleStatus={onToggleStatus}
            onToggleCategory={onToggleCategory}
            onClear={onClearFilters}
          />
        </div>
      )}

      <div className="feed-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {reports.length > 0 ? (
          <div className="flex flex-col">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                active={report.id === activeId}
                confirmed={confirmedIds.has(report.id)}
                onOpen={onOpen}
                onConfirm={onConfirm}
              />
            ))}
            {loading && (
              <p className="py-3 text-center text-[11px] font-medium text-ink-3">
                Updating map area…
              </p>
            )}
          </div>
        ) : error ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-pending-soft text-status-pending">
              <WifiOff size={20} />
            </span>
            <p className="text-sm font-semibold text-ink">
              Can&apos;t reach the server
            </p>
            <p className="max-w-56 text-xs leading-relaxed text-ink-2">
              Check your connection — pins you placed stay saved locally.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-civic px-4 text-xs font-semibold text-white"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        ) : loading ? (
          <SkeletonCards />
        ) : (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-ink-3">
              <MapPinOff size={20} />
            </span>
            <p className="text-sm font-semibold text-ink">
              {hasFilters ? "Nothing matches these filters" : "No reports in this area"}
            </p>
            <p className="max-w-60 text-xs leading-relaxed text-ink-2">
              {hasFilters
                ? "Try widening the status or category selection."
                : "Pan the map, or be the first to flag an issue here."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="min-h-11 rounded-xl border border-line px-4 text-xs font-semibold text-civic"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
