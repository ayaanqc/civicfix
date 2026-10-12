import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await cookies();
  const authenticated = verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
  return NextResponse.json({ authenticated });
}
