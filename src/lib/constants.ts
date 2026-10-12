import type { IssueCategory, IssueStatus } from "./types";

/* ------------------------------------------------------------------ */
/* Design tokens (mirrored in globals.css)                             */
/* ------------------------------------------------------------------ */

export const STATUS_META: Record<
  IssueStatus,
  { label: string; color: string; soft: string; description: string }
> = {
  pending: {
    label: "Pending",
    color: "#D97706",
    soft: "#FEF3C7",
    description: "Report logged, awaiting triage",
  },
  investigating: {
    label: "Investigating",
    color: "#4338CA",
    soft: "#E0E7FF",
    description: "Crew assigned, verifying on site",
  },
  in_progress: {
    label: "In Progress",
    color: "#2563EB",
    soft: "#DBEAFE",
    description: "Repair work underway",
  },
  resolved: {
    label: "Resolved",
    color: "#059669",
    soft: "#D1FAE5",
    description: "Issue fixed and verified",
  },
  dismissed: {
    label: "Dismissed",
    color: "#64748B",
    soft: "#E2E8F0",
    description: "Duplicate or out of scope",
  },
};

export const STATUS_ORDER: IssueStatus[] = [
  "pending",
  "investigating",
  "in_progress",
  "resolved",
  "dismissed",
];

/** 24x24 stroke SVG bodies (lucide-style) reused by Leaflet DivIcons. */
const SVG_BODY: Record<IssueCategory, string> = {
  pothole:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  street_light:
    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.5 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  sidewalk:
    '<circle cx="6" cy="19" r="2.5"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="2.5"/>',
  traffic_signal:
    '<rect x="8.5" y="2.5" width="7" height="19" rx="3.5"/><circle cx="12" cy="6.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="17.5" r="1.4"/>',
  illegal_dumping:
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  other:
    '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
};

export function categorySvg(category: IssueCategory): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SVG_BODY[category]}</svg>`;
}

export function categorySvgBody(category: IssueCategory): string {
  return SVG_BODY[category];
}

export const CATEGORY_META: Record<
  IssueCategory,
  { label: string; hint: string }
> = {
  pothole: { label: "Pothole", hint: "Road surface damage" },
  street_light: { label: "Street Light", hint: "Outages & flickering" },
  sidewalk: { label: "Sidewalk", hint: "Cracks & obstructions" },
  traffic_signal: { label: "Traffic Signal", hint: "Malfunctioning lights" },
  illegal_dumping: { label: "Illegal Dumping", hint: "Trash & debris" },
  other: { label: "Other", hint: "Anything else" },
};

export const CATEGORY_ORDER: IssueCategory[] = [
  "pothole",
  "street_light",
  "sidewalk",
  "traffic_signal",
  "illegal_dumping",
  "other",
];

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 280;

/** Default map center — San Francisco Civic Center (matches seed data). */
export const DEFAULT_CENTER: [number, number] = [37.779, -122.414];
export const DEFAULT_ZOOM = 15;
