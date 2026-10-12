"use client";

import { ThumbsUp } from "lucide-react";
import { CATEGORY_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatCoords, timeAgo } from "@/lib/time";
import type { ReportPayload } from "@/lib/types";
import { CategoryIcon } from "./category-icon";
import { StatusPill } from "./status-pill";

interface ReportCardProps {
  report: ReportPayload;
  active: boolean;
  confirmed: boolean;
  onOpen: (id: string) => void;
  onConfirm: (id: string) => void;
}

export function ReportCard({
  report,
  active,
  confirmed,
  onOpen,
  onConfirm,
}: ReportCardProps) {
  return (
    <article
      className={cn(
        "flex items-center gap-3 border-b border-line-soft bg-surface p-3 transition-colors",
        active && "bg-civic-soft/40",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(report.id)}
        aria-label={`Open report: ${report.title}`}
        className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border border-line-soft bg-surface-muted"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={report.image_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {report.syncing && (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/40 text-[10px] font-semibold uppercase tracking-wider text-white">
            Syncing
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onOpen(report.id)}
        className="flex min-h-[76px] min-w-0 flex-1 flex-col justify-between py-0.5 text-left"
      >
        <div>
          <h3 className="truncate text-sm font-medium text-ink">
            {report.title}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5">
            <StatusPill status={report.status} />
            <span className="flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-[11px] font-medium text-ink-2">
              <CategoryIcon category={report.category} size={12} />
              {CATEGORY_META[report.category].label}
            </span>
          </div>
        </div>
        <p className="truncate font-mono text-xs text-ink-3">
          {formatCoords(report.latitude, report.longitude)} ·{" "}
          {timeAgo(report.created_at)}
        </p>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onConfirm(report.id);
        }}
        disabled={confirmed || report.syncing}
        aria-label={
          confirmed
            ? `You verified this report (${report.upvote_count} confirmations)`
            : `I see this too — verify report (${report.upvote_count})`
        }
        className={cn(
          "flex h-[76px] w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-semibold transition-colors",
          confirmed
            ? "border-transparent bg-status-resolved-soft text-status-resolved"
            : "border-line bg-surface text-ink-2 hover:border-civic hover:text-civic",
          report.syncing && "opacity-50",
        )}
      >
        <ThumbsUp size={16} strokeWidth={2.2} />
        {report.upvote_count}
      </button>
    </article>
  );
}
