import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  checkPassword,
  issueAdminToken,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/admin/login — basic staff credential check */
export async function POST(request: NextRequest) {
  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    body = {};
  }

  if (!checkPassword(body.password)) {
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, issueAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
