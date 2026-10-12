import { and, eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { reportConfirmations, reports } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/reports/:id/confirm — "I See This Too" (spec §4.3) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { client_hash?: unknown };
  try {
    body = (await request.json()) as { client_hash?: unknown };
  } catch {
    body = {};
  }
  const clientHash =
    typeof body.client_hash === "string" ? body.client_hash.trim() : "";
  if (!clientHash || clientHash.length > 128) {
    return NextResponse.json({ error: "client_hash_required" }, { status: 400 });
  }

  const [report] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.id, id));
  if (!report)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  /* Dedupe — mirrors the unique_report_confirmation constraint (23505). */
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

  if (existing) {
    return NextResponse.json(
      { error: "already_confirmed" },
      { status: 409 },
    );
  }

  try {
    const upvoteCount = await db.transaction(async (tx) => {
      await tx
        .insert(reportConfirmations)
        .values({ reportId: id, clientHash });
      const [updated] = await tx
        .update(reports)
        .set({ upvoteCount: sql`${reports.upvoteCount} + 1` })
        .where(eq(reports.id, id))
        .returning({ upvoteCount: reports.upvoteCount });
      return updated.upvoteCount;
    });

    return NextResponse.json({ upvote_count: upvoteCount }, { status: 201 });
  } catch (error) {
    /* Race-guard: unique constraint violation → 409 Conflict */
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "already_confirmed" },
        { status: 409 },
      );
    }
    throw error;
  }
}
