import L from "leaflet";
import { categorySvg, STATUS_META } from "@/lib/constants";
import type { IssueCategory, IssueStatus } from "@/lib/types";

const iconCache = new Map<string, L.DivIcon>();

/**
 * Category-colored, status-semantic DivIcons. Pending pins carry a soft
 * pulse so new reports read as "fresh" on the map at a glance.
 */
export function createMarkerIcon(
  category: IssueCategory,
  status: IssueStatus,
  active: boolean,
  syncing = false,
): L.DivIcon {
  const key = `${category}|${status}|${active}|${syncing}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const color = STATUS_META[status].color;
  const pulse =
    status === "pending"
      ? `<span class="cf-marker-pulse" style="background:${color}"></span>`
      : "";
  const icon = L.divIcon({
    className: "cf-marker-wrap",
    html: `<div class="cf-marker${active ? " cf-marker--active" : ""}"${
      syncing ? ' style="opacity:.55"' : ""
    }>${pulse}<div class="cf-marker-body" style="background:${color}">${categorySvg(
      category,
    )}</div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -12],
  });
  iconCache.set(key, icon);
  return icon;
}

let userIcon: L.DivIcon | null = null;

export function userDotIcon(): L.DivIcon {
  if (!userIcon) {
    userIcon = L.divIcon({
      className: "cf-marker-wrap",
      html: '<div class="cf-user-dot"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }
  return userIcon;
}
