"use client";

import { CheckCircle2, Clock3, MapPin, ThumbsUp } from "lucide-react";
import { CATEGORY_META, STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatCoords, timeAgo } from "@/lib/time";
import type { ReportDetailPayload, ReportPayload } from "@/lib/types";
import { CategoryIcon } from "./category-icon";
import { StatusPill } from "./status-pill";

interface ReportDetailProps {
  report: ReportPayload;
  detail: ReportDetailPayload | null;
  confirmed: boolean;
  confirming: boolean;
  onConfirm: (id: string) => void;
}

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-line" />
          <span className="h-3 w-32 animate-pulse rounded bg-line-soft" />
        </div>
      ))}
    </div>
  );
}

export function ReportDetail({
  report,
  detail,
  confirmed,
  confirming,
  onConfirm,
}: ReportDetailProps) {
  const events = detail?.status_history ?? [];

  return (
    <div className="flex flex-col">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={report.image_url}
          alt={`Photo of reported issue: ${report.title}`}
          className="aspect-[16/10] w-full bg-surface-muted object-cover"
        />
        <div className="absolute left-3 top-3">
          <StatusPill status={report.status} className="shadow-card" />
        </div>
        {report.syncing && (
          <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Syncing…
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-2">
            <CategoryIcon category={report.category} size={14} />
            {CATEGORY_META[report.category].label}
          </span>
          <h2 className="text-lg font-semibold leading-snug tracking-tight text-ink">
            {report.title}
          </h2>
          {report.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
              {report.description}
            </p>
          )}
        </div>

        <div className="divide-y divide-line-soft rounded-xl border border-line-soft bg-surface-muted/60 text-xs">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
            <MapPin size={14} className="shrink-0 text-ink-3" />
            <span className="font-mono text-ink-2">
              {formatCoords(report.latitude, report.longitude)}
            </span>
            <span className="ml-auto text-ink-3">crosshair</span>
          </div>
          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
            <Clock3 size={14} className="shrink-0 text-ink-3" />
            <span className="text-ink-2">
              Reported {timeAgo(report.created_at)}
            </span>
            <span className="ml-auto font-mono text-ink-3">
              {new Date(report.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
            <ThumbsUp size={14} className="shrink-0 text-ink-3" />
            <span className="text-ink-2">
              {report.upvote_count}{" "}
              {report.upvote_count === 1 ? "neighbor has" : "neighbors have"}{" "}
              verified this
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onConfirm(report.id)}
          disabled={confirmed || confirming || report.syncing}
          className={cn(
            "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
            confirmed
              ? "bg-status-resolved-soft text-status-resolved"
              : "bg-civic text-white shadow-card hover:bg-civic-hover active:scale-[0.99]",
            (confirming || report.syncing) && !confirmed && "opacity-60",
          )}
        >
          {confirmed ? (
            <>
              <CheckCircle2 size={18} />
              You verified this report
            </>
          ) : (
            <>
              <ThumbsUp size={18} />
              I See This Too
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                {report.upvote_count}
              </span>
            </>
          )}
        </button>

        <div>
          <h3 className="mb-3 text-sm font-medium text-ink">
            Response timeline
          </h3>
          {detail ? (
            <ol className="relative flex flex-col gap-0">
              {events.map((event, index) => {
                const meta = STATUS_META[event.to_status];
                const isLast = index === events.length - 1;
                const label = event.from_status
                  ? `${STATUS_META[event.from_status].label} → ${meta.label}`
                  : "Report logged";
                return (
                  <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {!isLast && (
                      <span
                        aria-hidden
                        className="absolute left-[5px] top-4 h-full w-px bg-line-soft"
                      />
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-surface",
                        isLast && "ring-2",
                      )}
                      style={{
                        backgroundColor: meta.color,
                        ...(isLast ? { ["--tw-ring-color" as string]: meta.soft } : {}),
                      }}
                    />
                    <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "text-xs",
                          isLast ? "font-semibold text-ink" : "font-medium text-ink-2",
                        )}
                      >
                        {label}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-ink-3">
                        {timeAgo(event.created_at)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <TimelineSkeleton />
          )}
        </div>
      </div>
    </div>
  );
}
