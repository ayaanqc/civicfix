import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { reports, reportStatusEvents } from "@/db/schema";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";
import { STATUS_ORDER } from "@/lib/constants";
import { serializeReport, serializeStatusEvent } from "@/lib/serialize";
import type { IssueStatus, ReportDetailPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}

/* PATCH /api/admin/reports/:id — admin status quick-switch (spec §4.4) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: { status?: unknown };
  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const status = body.status;
  if (
    typeof status !== "string" ||
    !(STATUS_ORDER as string[]).includes(status)
  ) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const [current] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id));
  if (!current)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const next = status as IssueStatus;
  if (current.status !== next) {
    await db.transaction(async (tx) => {
      await tx
        .update(reports)
        .set({ status: next, updatedAt: new Date().toISOString() })
        .where(eq(reports.id, id));
      await tx.insert(reportStatusEvents).values({
        reportId: id,
        fromStatus: current.status,
        toStatus: next,
        note: null,
      });
    });
  }

  const [updated] = await db.select().from(reports).where(eq(reports.id, id));
  const events = await db
    .select()
    .from(reportStatusEvents)
    .where(eq(reportStatusEvents.reportId, id))
    .orderBy(asc(reportStatusEvents.createdAt));

  const payload: ReportDetailPayload = {
    ...serializeReport(updated),
    status_history: events.map(serializeStatusEvent),
  };
  return NextResponse.json(payload);
}

/* DELETE exists for staff cleanup of spam/duplicate pins. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await db.delete(reports).where(eq(reports.id, id));
  return NextResponse.json({ ok: true });
}
