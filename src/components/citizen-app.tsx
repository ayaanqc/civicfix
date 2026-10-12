"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import {
  ArrowLeft,
  Crosshair,
  ListFilter,
  LocateFixed,
  MapPinCheck,
  Plus,
  X,
} from "lucide-react";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { compressImage } from "@/lib/image-compressor";
import {
  getClientHash,
  getConfirmedIds,
  markConfirmed,
  unmarkConfirmed,
} from "@/lib/fingerprint";
import { cn } from "@/lib/utils";
import type {
  IssueCategory,
  IssueStatus,
  ReportDetailPayload,
  ReportPayload,
} from "@/lib/types";
import MapView, { type Bbox } from "./map-view";
import { AppHeader } from "./app-header";
import { FeedPanel, type SortMode } from "./feed-panel";
import { FilterBar, type FilterState } from "./filter-bar";
import { ReportDetail } from "./report-detail";
import { EMPTY_DRAFT, ReportForm, type ReportDraft } from "./report-form";
import { Toaster, type ToastItem } from "./toast";

type MobileSheet = "feed" | "detail" | null;
type DeskPanel = "feed" | "detail";

let toastSeq = 0;

export default function CitizenApp() {
  /* ------------------------------------------------------------ state */
  const [reports, setReports] = useState<Record<string, ReportPayload>>({});
  const [details, setDetails] = useState<Record<string, ReportDetailPayload>>({});
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    statuses: new Set<IssueStatus>(),
    categories: new Set<IssueCategory>(),
  });
  const [sort, setSort] = useState<SortMode>("newest");
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formLocation, setFormLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [savedDraft, setSavedDraft] = useState<ReportDraft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deskPanel, setDeskPanel] = useState<DeskPanel>("feed");
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const mapRef = useRef<LeafletMap | null>(null);
  const bboxRef = useRef<Bbox | null>(null);
  const bboxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSeq = useRef(0);

  /* ------------------------------------------------------------ toasts */
  const pushToast = useCallback((kind: ToastItem["kind"], message: string) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  /* ------------------------------------------------------------ fetch */
  const fetchReports = useCallback(async (bbox: Bbox) => {
    const seq = ++fetchSeq.current;
    const params = new URLSearchParams({
      minLat: bbox.minLat.toFixed(5),
      maxLat: bbox.maxLat.toFixed(5),
      minLng: bbox.minLng.toFixed(5),
      maxLng: bbox.maxLng.toFixed(5),
      limit: "800",
    });
    try {
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error(`status_${res.status}`);
      const rows = (await res.json()) as ReportPayload[];
      if (seq !== fetchSeq.current) return;
      setReports((prev) => {
        const next = { ...prev };
        for (const row of rows) {
          const existing = next[row.id];
          next[row.id] = existing?.syncing ? existing : row;
        }
        return next;
      });
      setFeedError(false);
      setLoading(false);
    } catch {
      if (seq !== fetchSeq.current) return;
      setFeedError(true);
      setLoading(false);
    }
  }, []);

  const handleViewportChange = useCallback(
    (bbox: Bbox) => {
      bboxRef.current = bbox;
      if (bboxTimer.current) clearTimeout(bboxTimer.current);
      bboxTimer.current = setTimeout(() => void fetchReports(bbox), 320);
    },
    [fetchReports],
  );

  const handleMapReady = useCallback((map: LeafletMap) => {
    mapRef.current = map;
  }, []);

  const retryFetch = useCallback(() => {
    if (bboxRef.current) {
      setLoading(true);
      void fetchReports(bboxRef.current);
    }
  }, [fetchReports]);

  /* ------------------------------------------------- geolocation, once */
  useEffect(() => {
    setConfirmedIds(new Set(getConfirmedIds()));
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        setFlyTarget({ ...p, ts: Date.now() });
      },
      () => undefined,
      { timeout: 6000, maximumAge: 60_000 },
    );
  }, []);

  const recenter = useCallback(() => {
    if (!navigator.geolocation) {
      pushToast("info", "Location isn't available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        setFlyTarget({ ...p, ts: Date.now() });
      },
      () => pushToast("info", "Couldn't get your position — check location permission."),
      { timeout: 6000, maximumAge: 10_000 },
    );
  }, [pushToast]);

  useEffect(() => {
    const onOffline = () =>
      pushToast("info", "You're offline — showing the last synced map.");
    window.addEventListener("offline", onOffline);
    return () => window.removeEventListener("offline", onOffline);
  }, [pushToast]);

  /* ------------------------------------------------------------ derive */
  const allReports = useMemo(() => Object.values(reports), [reports]);

  const filtered = useMemo(() => {
    const { statuses, categories } = filters;
    const list = allReports.filter(
      (r) =>
        (statuses.size === 0 || statuses.has(r.status)) &&
        (categories.size === 0 || categories.has(r.category)),
    );
    list.sort((a, b) =>
      sort === "verified"
        ? b.upvote_count - a.upvote_count ||
          b.created_at.localeCompare(a.created_at)
        : b.created_at.localeCompare(a.created_at),
    );
    return list;
  }, [allReports, filters, sort]);

  const openCount = useMemo(
    () =>
      allReports.filter(
        (r) =>
          r.status === "pending" ||
          r.status === "investigating" ||
          r.status === "in_progress",
      ).length,
    [allReports],
  );
  const resolvedCount = useMemo(
    () => allReports.filter((r) => r.status === "resolved").length,
    [allReports],
  );

  const activeReport = activeId ? (reports[activeId] ?? null) : null;
  const activeDetail = activeId ? (details[activeId] ?? null) : null;

  /* ----------------------------------------------------------- filters */
  const toggleIn = useCallback(
    <T,>(set: Set<T>, value: T): Set<T> => {
      const next = new Set(set);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    },
    [],
  );
  const toggleStatus = useCallback(
    (status: IssueStatus) =>
      setFilters((f) => ({ ...f, statuses: toggleIn(f.statuses, status) })),
    [toggleIn],
  );
  const toggleCategory = useCallback(
    (category: IssueCategory) =>
      setFilters((f) => ({
        ...f,
        categories: toggleIn(f.categories, category),
      })),
    [toggleIn],
  );
  const clearFilters = useCallback(
    () =>
      setFilters({
        statuses: new Set<IssueStatus>(),
        categories: new Set<IssueCategory>(),
      }),
    [],
  );

  /* --------------------------------------------------- detail + confirm */
  const openReport = useCallback(
    (id: string) => {
      setActiveId(id);
      setDeskPanel("detail");
      setMobileSheet("detail");
      const clientHash = getClientHash();
      fetch(`/api/reports/${id}?client_hash=${encodeURIComponent(clientHash)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((detail: ReportDetailPayload | null) => {
          if (!detail) return;
          setDetails((prev) => ({ ...prev, [id]: detail }));
          if (detail.confirmed_by_me) {
            setConfirmedIds((prev) => new Set(prev).add(id));
            markConfirmed(id);
          }
        })
        .catch(() => undefined);
    },
    [],
  );

  const closeDetail = useCallback(() => {
    setActiveId(null);
    setDeskPanel("feed");
    setMobileSheet((sheet) => (sheet === "detail" ? null : sheet));
  }, []);

  const confirmReport = useCallback(
    (id: string) => {
      if (id.startsWith("temp-")) return;
      if (confirmedIds.has(id)) {
        pushToast("info", "You have already verified this report.");
        return;
      }
      const clientHash = getClientHash();
      setConfirmingId(id);
      setConfirmedIds((prev) => new Set(prev).add(id));
      setReports((prev) =>
        prev[id]
          ? { ...prev, [id]: { ...prev[id], upvote_count: prev[id].upvote_count + 1 } }
          : prev,
      );

      fetch(`/api/reports/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_hash: clientHash }),
      })
        .then(async (res) => {
          if (res.status === 409) {
            setReports((prev) =>
              prev[id]
                ? { ...prev, [id]: { ...prev[id], upvote_count: prev[id].upvote_count - 1 } }
                : prev,
            );
            pushToast("info", "You have already verified this report.");
            return;
          }
          if (!res.ok) throw new Error(`status_${res.status}`);
          const data = (await res.json()) as { upvote_count?: number };
          markConfirmed(id);
          setDetails((prev) =>
            prev[id] ? { ...prev, [id]: { ...prev[id], confirmed_by_me: true } } : prev,
          );
          if (typeof data.upvote_count === "number") {
            setReports((prev) =>
              prev[id] ? { ...prev, [id]: { ...prev[id], upvote_count: data.upvote_count! } } : prev,
            );
          }
          pushToast("success", "Verified — thanks for flagging this.");
        })
        .catch(() => {
          setConfirmedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          unmarkConfirmed(id);
          setReports((prev) =>
            prev[id]
              ? { ...prev, [id]: { ...prev[id], upvote_count: prev[id].upvote_count - 1 } }
              : prev,
          );
          pushToast("error", "Couldn't save your verification. Try again.");
        })
        .finally(() => setConfirmingId(null));
    },
    [confirmedIds, pushToast],
  );

  /* ---------------------------------------------------- report creation */
  const startReporting = useCallback(() => {
    closeDetail();
    setMobileSheet(null);
    setSelecting(true);
  }, [closeDetail]);

  const handleSetLocation = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    setFormLocation({ lat: center.lat, lng: center.lng });
    setSelecting(false);
    setFormOpen(true);
    setFormError(null);
  }, []);

  const cancelForm = useCallback(() => {
    setFormOpen(false);
    setFormError(null);
    setSavedDraft(EMPTY_DRAFT);
  }, []);

  const submitDraft = useCallback(
    (draft: ReportDraft) => {
      if (!formLocation || !draft.photo || !draft.category) return;
      setFormOpen(false);

      const tempId = `temp-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const optimistic: ReportPayload = {
        id: tempId,
        user_id: null,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        category: draft.category,
        status: "pending",
        latitude: formLocation.lat,
        longitude: formLocation.lng,
        image_url: draft.previewUrl ?? "",
        upvote_count: 0,
        created_at: now,
        updated_at: now,
        syncing: true,
      };
      setReports((prev) => ({ ...prev, [tempId]: optimistic }));
      setSavedDraft(draft);
      pushToast("info", "Pin placed — uploading photo…");

      void (async () => {
        try {
          const blob = await compressImage(draft.photo!);
          const form = new FormData();
          form.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
          const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
          if (!uploadRes.ok) throw new Error("upload_failed");
          const { url } = (await uploadRes.json()) as { url: string };

          const createRes = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: optimistic.title,
              description: optimistic.description,
              category: optimistic.category,
              latitude: optimistic.latitude,
              longitude: optimistic.longitude,
              image_url: url,
            }),
          });
          if (!createRes.ok) throw new Error("create_failed");
          const created = (await createRes.json()) as ReportPayload;

          setReports((prev) => {
            const next = { ...prev };
            delete next[tempId];
            next[created.id] = created;
            return next;
          });
          setSavedDraft(EMPTY_DRAFT);
          setFormError(null);
          pushToast("success", "Report submitted — it's live on the map.");
        } catch {
          setReports((prev) => {
            const next = { ...prev };
            delete next[tempId];
            return next;
          });
          setFormError(
            "We couldn't submit that report. Your draft is saved — try again when you're back online.",
          );
          setFormOpen(true);
          pushToast("error", "Couldn't submit the report.");
        }
      })();
    },
    [formLocation, pushToast],
  );

  /* ------------------------------------------------------------- escape */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (formOpen) cancelForm();
      else if (selecting) setSelecting(false);
      else if (activeId) closeDetail();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen, selecting, activeId, cancelForm, closeDetail]);

  /* ------------------------------------------------------------ render */
  const feedProps = {
    reports: filtered,
    sort,
    onSortChange: setSort,
    filters,
    onToggleStatus: toggleStatus,
    onToggleCategory: toggleCategory,
    onClearFilters: clearFilters,
    loading,
    error: feedError,
    onRetry: retryFetch,
    activeId,
    confirmedIds,
    onOpen: openReport,
    onConfirm: confirmReport,
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg-app">
      <AppHeader openCount={openCount} resolvedCount={resolvedCount} />

      <div className="relative flex min-h-0 flex-1">
        {/* ------------------------------------------------ map lane */}
        <main className="relative min-w-0 flex-1">
          <MapView
            reports={filtered}
            activeId={activeId}
            selecting={selecting}
            flyTarget={flyTarget}
            userPos={userPos}
            onViewportChange={handleViewportChange}
            onMarkerClick={openReport}
            onMapReady={handleMapReady}
          />

          {/* mobile filter overlay */}
          {!selecting && (
            <div className="absolute inset-x-3 top-3 z-[900] lg:hidden">
              <FilterBar
                compact
                filters={filters}
                onToggleStatus={toggleStatus}
                onToggleCategory={toggleCategory}
                onClear={clearFilters}
              />
            </div>
          )}

          {/* crosshair report mode — spec §1.4 */}
          {selecting && (
            <div className="absolute inset-0 z-[950]">
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative flex h-14 w-14 items-center justify-center">
                  <span className="cf-crosspulse absolute h-10 w-10 rounded-full border-2 border-civic" />
                  <Crosshair size={34} strokeWidth={1.8} className="text-civic drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]" />
                </div>
              </div>
              <div className="pointer-events-none absolute left-1/2 top-3 w-max max-w-[92vw] -translate-x-1/2 rounded-full bg-ink/85 px-4 py-2.5 text-center text-xs font-semibold text-white backdrop-blur">
                Drag the map to position the pin, then set the location
              </div>
              <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2 px-4 pb-safe">
                <button
                  type="button"
                  onClick={() => setSelecting(false)}
                  className="h-12 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink-2 shadow-card"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSetLocation}
                  className="flex h-12 items-center gap-2 rounded-full bg-civic px-6 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-civic-hover"
                >
                  <MapPinCheck size={17} />
                  Set Location
                </button>
              </div>
            </div>
          )}

          {/* floating actions */}
          {!selecting && (
            <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[900] flex items-end justify-between px-4 pb-safe lg:justify-end lg:gap-3">
              <button
                type="button"
                onClick={() => {
                  closeDetail();
                  setMobileSheet("feed");
                }}
                className="pointer-events-auto flex h-12 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink shadow-card lg:hidden"
                aria-label="Open reports feed"
              >
                <ListFilter size={17} />
                <span className="rounded-full bg-civic-soft px-2 py-0.5 text-xs font-bold text-civic">
                  {filtered.length}
                </span>
              </button>

              <div className="pointer-events-auto flex flex-col items-end gap-3">
                <button
                  type="button"
                  onClick={recenter}
                  aria-label="Recenter map on my location"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-ink-2 shadow-card transition-colors hover:text-civic"
                >
                  <LocateFixed size={19} />
                </button>
                <button
                  type="button"
                  onClick={startReporting}
                  className="flex h-14 items-center gap-2 rounded-full bg-civic px-5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-civic-hover active:scale-[0.98]"
                >
                  <Plus size={19} strokeWidth={2.6} />
                  Report Issue
                </button>
              </div>
            </div>
          )}

          {/* status legend (desktop) */}
          <div className="pointer-events-none absolute bottom-28 left-3 z-[900] hidden lg:block">
            <div className="rounded-xl border border-line bg-surface/95 p-3 shadow-card backdrop-blur">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-3">
                Status
              </p>
              <ul className="flex flex-col gap-1.5">
                {STATUS_ORDER.map((status) => (
                  <li key={status} className="flex items-center gap-2 text-[11px] font-medium text-ink-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_META[status].color }}
                    />
                    {STATUS_META[status].label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </main>

        {/* ------------------------------------------------ right rail */}
        <aside className="hidden w-[400px] shrink-0 border-l border-line bg-surface lg:flex lg:flex-col xl:w-[440px]">
          {deskPanel === "feed" ? (
            <FeedPanel {...feedProps} withFilters />
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center border-b border-line-soft p-2">
                <button
                  type="button"
                  onClick={closeDetail}
                  className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-civic transition-colors hover:bg-civic-soft/60"
                >
                  <ArrowLeft size={16} />
                  All reports
                </button>
              </div>
              <div className="feed-scroll min-h-0 flex-1 overflow-y-auto">
                {activeReport && (
                  <ReportDetail
                    report={activeReport}
                    detail={activeDetail}
                    confirmed={confirmedIds.has(activeReport.id)}
                    confirming={confirmingId === activeReport.id}
                    onConfirm={confirmReport}
                  />
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ----------------------------------------- mobile feed sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[1000] transition-transform duration-300 ease-out lg:hidden",
          mobileSheet === "feed" ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex h-[74dvh] flex-col rounded-t-3xl border-t border-line bg-surface shadow-sheet">
          <button
            type="button"
            onClick={() => setMobileSheet(null)}
            aria-label="Close feed"
            className="flex w-full items-center justify-center pb-1 pt-2.5"
          >
            <span className="h-1.5 w-10 rounded-full bg-line" />
          </button>
          <FeedPanel {...feedProps} withFilters={false} />
        </div>
      </div>

      {/* --------------------------------------- mobile detail sheet */}
      {mobileSheet === "detail" && activeReport && (
        <button
          type="button"
          aria-label="Close report detail"
          onClick={closeDetail}
          className="fixed inset-0 z-[990] bg-ink/40 lg:hidden"
        />
      )}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[1000] transition-transform duration-300 ease-out lg:hidden",
          mobileSheet === "detail" ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex max-h-[86dvh] flex-col overflow-hidden rounded-t-3xl border-t border-line bg-surface shadow-sheet">
          <div className="flex w-full items-center justify-center pb-0 pt-2.5">
            <span className="h-1.5 w-10 rounded-full bg-line" />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={closeDetail}
              aria-label="Close report detail"
              className="absolute right-3 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-surface/95 text-ink-2 shadow-card"
            >
              <X size={18} />
            </button>
            <div className="feed-scroll max-h-[80dvh] overflow-y-auto overscroll-contain">
              {activeReport && (
                <ReportDetail
                  report={activeReport}
                  detail={activeDetail}
                  confirmed={confirmedIds.has(activeReport.id)}
                  confirming={confirmingId === activeReport.id}
                  onConfirm={confirmReport}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------- form drawer */}
      {formOpen && (
        <div
          role="presentation"
          onClick={cancelForm}
          className="fixed inset-0 z-[1090] bg-ink/45"
        />
      )}
      <div
        className={cn(
          "fixed z-[1100] bg-surface transition-transform duration-300 ease-out",
          "inset-x-0 bottom-0 max-h-[94dvh] rounded-t-3xl shadow-sheet",
          "lg:inset-x-auto lg:bottom-0 lg:right-0 lg:top-0 lg:h-full lg:max-h-none lg:w-[440px] lg:rounded-none lg:border-l lg:border-line",
          formOpen
            ? "translate-y-0 lg:translate-x-0"
            : "pointer-events-none translate-y-full lg:translate-x-full lg:translate-y-0",
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line lg:hidden" />
        <div className="h-[min(88dvh,760px)] lg:h-full">
          {formOpen && formLocation && (
            <ReportForm
              location={formLocation}
              initial={savedDraft}
              error={formError}
              onCancel={cancelForm}
              onSubmit={submitDraft}
            />
          )}
        </div>
      </div>

      <Toaster toasts={toasts} />
    </div>
  );
}
