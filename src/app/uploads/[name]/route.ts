import { readFile } from "fs/promises";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  gif: "image/gif",
};

/**
 * GET /uploads/:name — public object-storage bucket replacement.
 * Streams binary assets written by /api/upload (and committed seeds).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  /* Path traversal guard — files are flat UUID/seed names only. */
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "uploads", name);
  try {
    const data = await readFile(filePath);
    const ext = name.split(".").pop()?.toLowerCase() ?? "jpg";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPE[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
