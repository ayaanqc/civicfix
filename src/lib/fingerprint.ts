"use client";

const HASH_KEY = "civicfix_client_hash";
const CONFIRMED_KEY = "civicfix_confirmations";

/**
 * Anonymous client identity used to dedupe "I See This Too" confirmations
 * without requiring full citizen authentication.
 */
export function getClientHash(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(HASH_KEY);
    if (existing) return existing;
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    const hash = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    window.localStorage.setItem(HASH_KEY, hash);
    return hash;
  } catch {
    return "anon";
  }
}

export function getConfirmedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONFIRMED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function markConfirmed(reportId: string) {
  if (typeof window === "undefined") return;
  try {
    const ids = new Set(getConfirmedIds());
    ids.add(reportId);
    window.localStorage.setItem(CONFIRMED_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable — server still dedupes */
  }
}

export function unmarkConfirmed(reportId: string) {
  if (typeof window === "undefined") return;
  try {
    const ids = new Set(getConfirmedIds());
    ids.delete(reportId);
    window.localStorage.setItem(CONFIRMED_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable */
  }
}
