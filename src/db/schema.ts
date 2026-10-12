import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums (mirrors the CivicFix DDL contract)                           */
/* ------------------------------------------------------------------ */

export const issueCategoryEnum = pgEnum("issue_category", [
  "pothole",
  "street_light",
  "sidewalk",
  "traffic_signal",
  "illegal_dumping",
  "other",
]);

export const issueStatusEnum = pgEnum("issue_status", [
  "pending",
  "investigating",
  "in_progress",
  "resolved",
  "dismissed",
]);

export const userRoleEnum = pgEnum("user_role", ["citizen", "admin"]);

/* ------------------------------------------------------------------ */
/* profiles — staff identity for the admin console                     */
/* ------------------------------------------------------------------ */

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("citizen"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/* reports — the core civic issue record                               */
/* ------------------------------------------------------------------ */

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 60 }).notNull(),
    description: varchar("description", { length: 280 }),
    category: issueCategoryEnum("category").notNull(),
    status: issueStatusEnum("status").notNull().default("pending"),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    imageUrl: text("image_url").notNull(),
    upvoteCount: integer("upvote_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("valid_latitude", sql`${t.latitude} >= -90 AND ${t.latitude} <= 90`),
    check(
      "valid_longitude",
      sql`${t.longitude} >= -180 AND ${t.longitude} <= 180`,
    ),
    index("idx_reports_status").on(t.status),
    index("idx_reports_category").on(t.category),
    index("idx_reports_coordinates").on(t.latitude, t.longitude),
    index("idx_reports_created_at").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* report_confirmations — "I See This Too" dedupe ledger               */
/* ------------------------------------------------------------------ */

export const reportConfirmations = pgTable(
  "report_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    clientHash: text("client_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("unique_report_confirmation").on(t.reportId, t.clientHash),
    index("idx_confirmations_lookup").on(t.reportId, t.clientHash),
  ],
);

/* ------------------------------------------------------------------ */
/* report_status_events — timeline shown on the issue detail card      */
/* ------------------------------------------------------------------ */

export const reportStatusEvents = pgTable(
  "report_status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    fromStatus: issueStatusEnum("from_status"),
    toStatus: issueStatusEnum("to_status").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_status_events_report").on(t.reportId, t.createdAt)],
);

export type ReportRow = typeof reports.$inferSelect;
export type ConfirmationRow = typeof reportConfirmations.$inferSelect;
export type StatusEventRow = typeof reportStatusEvents.$inferSelect;
