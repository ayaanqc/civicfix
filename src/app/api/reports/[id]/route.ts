import { and, asc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import {
  reportConfirmations,
  reports,
  reportStatusEvents,
} from "@/db/schema";
import { serializeReport, serializeStatusEvent } from "@/lib/serialize";
import type { ReportDetailPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/reports/:id — detail card payload with status history */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [row] = await db.select().from(reports).where(eq(reports.id, id));
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const events = await db
    .select()
    .from(reportStatusEvents)
    .where(eq(reportStatusEvents.reportId, id))
    .orderBy(asc(reportStatusEvents.createdAt));

  const clientHash = request.nextUrl.searchParams.get("client_hash") ?? "";
  let confirmedByMe = false;
  if (clientHash) {
    const [existing] = await db
      .select({ id: reportConfirmations.id })
      .from(reportConfirmations)
      .where(
        and(
          eq(reportConfirmations.reportId, id),
          eq(reportConfirmations.clientHash, clientHash),
        ),
      )
      .limit(1);
    confirmedByMe = Boolean(existing);
  }

  const payload: ReportDetailPayload = {
    ...serializeReport(row),
    confirmed_by_me: confirmedByMe,
    status_history: events.map(serializeStatusEvent),
  };

  return NextResponse.json(payload);
}
