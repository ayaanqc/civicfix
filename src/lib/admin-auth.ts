import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "cf_admin";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "civicfix-admin";
}

function token(): string {
  return createHmac("sha256", `civicfix-admin-session:${adminPassword()}`)
    .update("granted")
    .digest("hex");
}

export function issueAdminToken(): string {
  return token();
}

export function verifyAdminToken(value: string | undefined | null): boolean {
  if (!value) return false;
  const expected = Buffer.from(token(), "utf8");
  const provided = Buffer.from(value, "utf8");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function checkPassword(candidate: unknown): boolean {
  return typeof candidate === "string" && candidate === adminPassword();
}
