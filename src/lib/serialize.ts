import type { ReportRow, StatusEventRow } from "@/db/schema";
import type { ReportPayload, StatusEventPayload } from "./types";

/** Row → the snake_case JSON contract documented in the spec (§4). */
export function serializeReport(row: ReportRow): ReportPayload {
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    image_url: row.imageUrl,
    upvote_count: row.upvoteCount,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function serializeStatusEvent(row: StatusEventRow): StatusEventPayload {
  return {
    id: row.id,
    from_status: row.fromStatus,
    to_status: row.toStatus,
    note: row.note,
    created_at: row.createdAt,
  };
}
