import { and, desc, gte, inArray, lte, type SQL } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { reports, reportStatusEvents } from "@/db/schema";
import {
  CATEGORY_ORDER,
  DESCRIPTION_MAX,
  STATUS_ORDER,
  TITLE_MAX,
} from "@/lib/constants";
import { serializeReport } from "@/lib/serialize";
import type { IssueCategory, IssueStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------------------------------------------------------- */
/* GET /api/reports — bounded viewport fetch (spec §4.2)              */
/* ---------------------------------------------------------------- */

const isCategory = (v: string): v is IssueCategory =>
  (CATEGORY_ORDER as string[]).includes(v);
const isStatus = (v: string): v is IssueStatus =>
  (STATUS_ORDER as string[]).includes(v);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const num = (key: string) => {
    const raw = params.get(key);
    if (raw == null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  const conditions: SQL[] = [];
  const minLat = num("minLat");
  const maxLat = num("maxLat");
  const minLng = num("minLng");
  const maxLng = num("maxLng");
  if (minLat !== undefined) conditions.push(gte(reports.latitude, minLat));
  if (maxLat !== undefined) conditions.push(lte(reports.latitude, maxLat));
  if (minLng !== undefined) conditions.push(gte(reports.longitude, minLng));
  if (maxLng !== undefined) conditions.push(lte(reports.longitude, maxLng));

  const statuses = (params.get("status") ?? "")
    .split(",")
    .filter(isStatus);
  if (statuses.length) conditions.push(inArray(reports.status, statuses));

  const categories = (params.get("category") ?? "")
    .split(",")
    .filter(isCategory);
  if (categories.length)
    conditions.push(inArray(reports.category, categories));

  const limit = Math.min(Math.max(num("limit") ?? 500, 1), 1000);

  const rows = await db
    .select()
    .from(reports)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(reports.createdAt))
    .limit(limit);

  return NextResponse.json(rows.map(serializeReport));
}

/* ---------------------------------------------------------------- */
/* POST /api/reports — create (spec §4.1)                             */
/* ---------------------------------------------------------------- */

interface CreateBody {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  image_url?: unknown;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return badRequest("invalid_json");
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return badRequest("title_required");
  if (title.length > TITLE_MAX) return badRequest("title_too_long");

  let description: string | null = null;
  if (typeof body.description === "string" && body.description.trim()) {
    description = body.description.trim();
    if (description.length > DESCRIPTION_MAX)
      return badRequest("description_too_long");
  }

  if (typeof body.category !== "string" || !isCategory(body.category))
    return badRequest("invalid_category");

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
    return badRequest("invalid_latitude");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    return badRequest("invalid_longitude");

  const imageUrl =
    typeof body.image_url === "string" ? body.image_url.trim() : "";
  if (!imageUrl || (!imageUrl.startsWith("/uploads/") && !imageUrl.startsWith("https://")))
    return badRequest("image_required");

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(reports)
      .values({
        title,
        description,
        category: body.category as IssueCategory,
        latitude,
        longitude,
        imageUrl,
      })
      .returning();

    await tx.insert(reportStatusEvents).values({
      reportId: row.id,
      fromStatus: null,
      toStatus: "pending",
      note: "Report submitted by a resident",
    });

    return row;
  });

  return NextResponse.json(serializeReport(created), { status: 201 });
}
