"use client";

import { useRef, useState } from "react";
import { Camera, Crosshair, ImagePlus, X } from "lucide-react";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  DESCRIPTION_MAX,
  TITLE_MAX,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { readFileAsDataUrl } from "@/lib/image-compressor";
import { formatCoords } from "@/lib/time";
import type { IssueCategory } from "@/lib/types";
import { CategoryIcon } from "./category-icon";

export interface ReportDraft {
  title: string;
  description: string;
  category: IssueCategory | null;
  photo: File | null;
  previewUrl: string | null;
}

export const EMPTY_DRAFT: ReportDraft = {
  title: "",
  description: "",
  category: null,
  photo: null,
  previewUrl: null,
};

interface ReportFormProps {
  location: { lat: number; lng: number };
  initial: ReportDraft;
  error: string | null;
  onCancel: () => void;
  onSubmit: (draft: ReportDraft) => void;
}

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-3 transition-colors focus:border-civic focus:outline-none";

export function ReportForm({
  location,
  initial,
  error,
  onCancel,
  onSubmit,
}: ReportFormProps) {
  const [draft, setDraft] = useState<ReportDraft>(initial);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const ready = Boolean(draft.photo && draft.category && draft.title.trim());

  function handlePhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("That file is not an image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setPhotoError("Photo is too large (max 20 MB).");
      return;
    }
    setPhotoError(null);
    void readFileAsDataUrl(file).then((previewUrl) =>
      setDraft((d) => ({ ...d, photo: file, previewUrl })),
    );
  }

  return (
    <div className="flex max-h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          New Report
        </h2>
        <span className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 font-mono text-[11px] text-ink-2">
          <Crosshair size={12} className="text-civic" />
          {formatCoords(location.lat, location.lng)}
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close report form"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-muted"
        >
          <X size={18} />
        </button>
      </div>

      <div className="feed-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-status-pending/30 bg-status-pending-soft px-3.5 py-2.5 text-xs font-medium text-status-pending"
          >
            {error}
          </div>
        )}

        {/* Photo capture — spec §2.1 Direct Storage Asset Pipeline */}
        <div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handlePhoto(e.target.files?.[0])}
          />
          {draft.previewUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={draft.previewUrl}
                alt="Selected issue photo preview"
                className="h-44 w-full object-cover"
              />
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="min-h-11 rounded-lg bg-ink/80 px-3 text-xs font-semibold text-white backdrop-blur"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({ ...d, photo: null, previewUrl: null }))
                  }
                  className="min-h-11 rounded-lg bg-ink/80 px-3 text-xs font-semibold text-white backdrop-blur"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={cn(
                "flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm font-medium transition-colors",
                photoError
                  ? "border-status-pending bg-status-pending-soft/40 text-status-pending"
                  : "border-line bg-surface-muted/60 text-ink-2 hover:border-civic hover:text-civic",
              )}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-card">
                <Camera size={20} />
              </span>
              Add a photo
              <span className="text-xs font-normal text-ink-3">
                Camera or library · compressed on-device
              </span>
            </button>
          )}
          {photoError && (
            <p className="mt-1.5 text-xs font-medium text-status-pending">
              {photoError}
            </p>
          )}
        </div>

        {/* Category picker */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">
            Category
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_ORDER.map((category) => {
              const active = draft.category === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, category }))}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-14 items-center gap-2.5 rounded-xl border px-3 text-left transition-all",
                    active
                      ? "border-civic bg-civic-soft/60 text-civic shadow-card"
                      : "border-line bg-surface text-ink-2 hover:border-ink-3",
                  )}
                >
                  <CategoryIcon
                    category={category}
                    size={18}
                    className={active ? "text-civic" : "text-ink-3"}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">
                      {CATEGORY_META[category].label}
                    </span>
                    <span className="block truncate text-[10px] text-ink-3">
                      {CATEGORY_META[category].hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Title */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label
              htmlFor="cf-title"
              className="text-sm font-medium text-ink"
            >
              Short title
            </label>
            <span className="font-mono text-[11px] text-ink-3">
              {draft.title.length}/{TITLE_MAX}
            </span>
          </div>
          <input
            id="cf-title"
            value={draft.title}
            maxLength={TITLE_MAX}
            onChange={(e) =>
              setDraft((d) => ({ ...d, title: e.target.value }))
            }
            placeholder="e.g. Deep pothole damaging wheels"
            className={cn(inputClass, "h-12")}
          />
        </div>

        {/* Description */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label
              htmlFor="cf-description"
              className="text-sm font-medium text-ink"
            >
              Details{" "}
              <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <span className="font-mono text-[11px] text-ink-3">
              {draft.description.length}/{DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            id="cf-description"
            value={draft.description}
            maxLength={DESCRIPTION_MAX}
            rows={3}
            onChange={(e) =>
              setDraft((d) => ({ ...d, description: e.target.value }))
            }
            placeholder="Lane, direction, landmarks, severity…"
            className={cn(inputClass, "resize-none py-3 leading-relaxed")}
          />
        </div>
      </div>

      <div className="border-t border-line-soft bg-surface p-4 pb-safe">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-xl border border-line px-5 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => ready && onSubmit(draft)}
            className={cn(
              "flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
              ready
                ? "bg-civic text-white shadow-card hover:bg-civic-hover active:scale-[0.99]"
                : "cursor-not-allowed bg-surface-muted text-ink-3",
            )}
          >
            <ImagePlus size={17} />
            Submit Report
          </button>
        </div>
        {!ready && (
          <p className="mt-2 text-center text-[11px] font-medium text-ink-3">
            Photo, category and title are required
          </p>
        )}
      </div>
    </div>
  );
}
