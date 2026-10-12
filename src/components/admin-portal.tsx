"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  ThumbsUp,
} from "lucide-react";
import { CATEGORY_META, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatCoords, timeAgo } from "@/lib/time";
import type { IssueStatus, ReportDetailPayload, ReportPayload } from "@/lib/types";
import { CategoryIcon } from "./category-icon";
import { Toaster, type ToastItem } from "./toast";

let toastSeq = 0;

type AuthState = "checking" | "login" | "ok";

export default function AdminPortal() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const [reports, setReports] = useState<ReportPayload[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<IssueStatus>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const loadedRef = useRef(false);

  const pushToast = useCallback((kind: ToastItem["kind"], message: string) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3600,
    );
  }, []);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/reports?limit=1000");
      if (!res.ok) throw new Error();
      setReports((await res.json()) as ReportPayload[]);
    } catch {
      pushToast("error", "Couldn't load reports.");
    } finally {
      setLoadingReports(false);
    }
  }, [pushToast]);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data: { authenticated: boolean }) => {
        setAuth(data.authenticated ? "ok" : "login");
      })
      .catch(() => setAuth("login"));
  }, []);

  useEffect(() => {
    if (auth === "ok" && !loadedRef.current) {
      loadedRef.current = true;
      void loadReports();
    }
  }, [auth, loadReports]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!password || loggingIn) return;
    setLoggingIn(true);
    setLoginError(false);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setLoginError(true);
        return;
      }
      setAuth("ok");
    } catch {
      pushToast("error", "Login failed — check your connection.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    setAuth("login");
    setPassword("");
  }

  async function changeStatus(report: ReportPayload, status: IssueStatus) {
    if (status === report.status || savingId) return;
    setSavingId(report.id);
    const previous = report.status;
    setReports((prev) =>
      prev.map((r) => (r.id === report.id ? { ...r, status } : r)),
    );
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        setAuth("login");
        return;
      }
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as ReportDetailPayload;
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, ...updated } : r)),
      );
      pushToast("success", `“${report.title}” marked ${STATUS_META[status].label}.`);
    } catch {
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, status: previous } : r)),
      );
      pushToast("error", "Status update failed — reverted.");
    } finally {
      setSavingId(null);
    }
  }

  const counts = useMemo(() => {
    const map = new Map<IssueStatus, number>();
    for (const status of STATUS_ORDER) map.set(status, 0);
    for (const report of reports)
      map.set(report.status, (map.get(report.status) ?? 0) + 1);
    return map;
  }, [reports]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((report) => {
      if (statusFilter.size > 0 && !statusFilter.has(report.status)) return false;
      if (!q) return true;
      return (
        report.title.toLowerCase().includes(q) ||
        CATEGORY_META[report.category].label.toLowerCase().includes(q) ||
        formatCoords(report.latitude, report.longitude).includes(q)
      );
    });
  }, [reports, query, statusFilter]);

  /* ------------------------------------------------------- login view */
  if (auth !== "ok") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg-app p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8"
        >
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-civic text-white shadow-card">
              <ShieldCheck size={26} />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-ink">
                Staff Console
              </h1>
              <p className="mt-0.5 text-xs text-ink-2">
                Authorized city personnel only. Changes are logged.
              </p>
            </div>
          </div>

          <label
            htmlFor="cf-admin-password"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Access code
          </label>
          <div className="relative">
            <input
              id="cf-admin-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter staff access code"
              className={cn(
                "h-12 w-full rounded-xl border bg-surface px-3.5 pr-12 text-sm text-ink placeholder:text-ink-3 focus:outline-none",
                loginError
                  ? "border-status-pending focus:border-status-pending"
                  : "border-line focus:border-civic",
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide access code" : "Show access code"}
              className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-ink-3 hover:text-ink"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {loginError && (
            <p role="alert" className="mt-2 text-xs font-medium text-status-pending">
              Incorrect access code. Try again.
            </p>
          )}

          <button
            type="submit"
            disabled={!password || loggingIn || auth === "checking"}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-civic text-sm font-semibold text-white shadow-card transition-colors hover:bg-civic-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-3"
          >
            {loggingIn && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>

          <p className="mt-4 text-center text-[11px] text-ink-3">
            Demo access code: <span className="font-mono">civicfix-admin</span>
          </p>

          <Link
            href="/"
            className="mx-auto mt-3 flex w-fit min-h-11 items-center gap-1.5 px-2 text-xs font-semibold text-ink-2 hover:text-civic"
          >
            <ArrowLeft size={13} />
            Back to public map
          </Link>
        </form>
        <Toaster toasts={toasts} />
      </div>
    );
  }

  /* ------------------------------------------------------- console view */
  const statOrder: IssueStatus[] = [
    "pending",
    "investigating",
    "in_progress",
    "resolved",
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-bg-app">
      <header className="border-b border-ink/80 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-civic">
            <MapPin size={15} strokeWidth={2.4} />
          </span>
          <h1 className="text-sm font-semibold tracking-tight">
            CivicFix <span className="font-normal text-white/60">/ Staff Console</span>
          </h1>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white/80 transition-colors hover:text-white"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Public map</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white/80 transition-colors hover:text-white"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-4 sm:p-6">
        {/* stats */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {statOrder.map((status) => {
            const meta = STATUS_META[status];
            return (
              <div
                key={status}
                className="rounded-2xl border border-line bg-surface p-4 shadow-card"
              >
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  {meta.label}
                </p>
                <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
                  {counts.get(status) ?? 0}
                </p>
              </div>
            );
          })}
        </div>

        {/* controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, category or coordinates…"
              aria-label="Search reports"
              className="h-12 w-full rounded-xl border border-line bg-surface pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-3 focus:border-civic focus:outline-none"
            />
          </div>
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
            {STATUS_ORDER.map((status) => {
              const active = statusFilter.has(status);
              const meta = STATUS_META[status];
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setStatusFilter((prev) => {
                      const next = new Set(prev);
                      if (next.has(status)) next.delete(status);
                      else next.add(status);
                      return next;
                    })
                  }
                  style={active ? { backgroundColor: meta.soft } : undefined}
                  className={cn(
                    "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                    active
                      ? "border-transparent text-ink"
                      : "border-line bg-surface text-ink-2",
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  {meta.label}
                  <span className="text-ink-3">{counts.get(status) ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* queue */}
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <div className="hidden grid-cols-[64px_minmax(0,1fr)_150px_150px_120px_170px] items-center gap-3 border-b border-line-soft bg-surface-muted/60 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink-3 lg:grid">
            <span>Photo</span>
            <span>Report</span>
            <span>Current status</span>
            <span>Verified</span>
            <span>Reported</span>
            <span>Set status</span>
          </div>

          {loadingReports ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-ink-3">
              <Loader2 size={16} className="animate-spin" />
              Loading queue…
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <CheckCircle2 size={22} className="text-status-resolved" />
              <p className="text-sm font-semibold text-ink">Queue is clear</p>
              <p className="text-xs text-ink-2">
                No reports match the current search or filters.
              </p>
            </div>
          ) : (
            visible.map((report) => {
              const meta = STATUS_META[report.status];
              const saving = savingId === report.id;
              return (
                <div
                  key={report.id}
                  className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-0 lg:grid-cols-[64px_minmax(0,1fr)_150px_150px_120px_170px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.image_url}
                    alt=""
                    loading="lazy"
                    className="h-12 w-16 rounded-lg border border-line-soft object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {report.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-2">
                      <CategoryIcon category={report.category} size={12} />
                      {CATEGORY_META[report.category].label}
                      <span className="font-mono text-ink-3">
                        {formatCoords(report.latitude, report.longitude)}
                      </span>
                    </p>
                    <p className="mt-1 flex items-center gap-3 text-[11px] text-ink-3 lg:hidden">
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={11} />
                        {report.upvote_count}
                      </span>
                      {timeAgo(report.created_at)}
                    </p>
                  </div>

                  <div className="col-span-2 mt-2 lg:col-span-1 lg:mt-0">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ backgroundColor: meta.soft, color: meta.color }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </span>
                  </div>

                  <div className="hidden items-center gap-1.5 text-xs font-medium text-ink-2 lg:flex">
                    <ThumbsUp size={13} className="text-ink-3" />
                    {report.upvote_count}{" "}
                    {report.upvote_count === 1 ? "neighbor" : "neighbors"}
                  </div>

                  <div className="hidden text-xs text-ink-2 lg:block">
                    {timeAgo(report.created_at)}
                  </div>

                  <div className="relative col-span-2 lg:col-span-1">
                    <select
                      value={report.status}
                      disabled={saving}
                      onChange={(e) =>
                        changeStatus(report, e.target.value as IssueStatus)
                      }
                      aria-label={`Set status for “${report.title}”`}
                      className="h-11 w-full appearance-none rounded-xl border border-line bg-surface px-3 pr-9 text-xs font-semibold text-ink focus:border-civic focus:outline-none disabled:opacity-60"
                      style={{ borderColor: meta.color, color: meta.color }}
                    >
                      {STATUS_ORDER.map((status) => (
                        <option
                          key={status}
                          value={status}
                          style={{ color: "#0F172A" }}
                        >
                          {STATUS_META[status].label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      {saving ? (
                        <Loader2 size={14} className="animate-spin text-ink-3" />
                      ) : (
                        <span className="text-ink-3">▾</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-center text-[11px] text-ink-3">
          {visible.length} of {reports.length} reports · status changes sync to
          the public timeline instantly
        </p>
      </main>
      <Toaster toasts={toasts} />
    </div>
  );
}
