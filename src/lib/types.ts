export type IssueCategory =
  | "pothole"
  | "street_light"
  | "sidewalk"
  | "traffic_signal"
  | "illegal_dumping"
  | "other";

export type IssueStatus =
  | "pending"
  | "investigating"
  | "in_progress"
  | "resolved"
  | "dismissed";

/** Mirrors the PostgREST-style JSON contract from the product spec. */
export interface ReportPayload {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  category: IssueCategory;
  status: IssueStatus;
  latitude: number;
  longitude: number;
  image_url: string;
  upvote_count: number;
  created_at: string;
  updated_at: string;
  /** Present only on detail fetches. */
  confirmed_by_me?: boolean;
  /** Client-only flag: optimistic pin still syncing to the server. */
  syncing?: boolean;
}

export interface StatusEventPayload {
  id: string;
  from_status: IssueStatus | null;
  to_status: IssueStatus;
  note: string | null;
  created_at: string;
}

export interface ReportDetailPayload extends ReportPayload {
  status_history: StatusEventPayload[];
}

export interface BboxQuery {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}
