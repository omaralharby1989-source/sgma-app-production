import { pgTable, text, serial, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const articleStatusEnum = pgEnum("article_status", [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
]);

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  content: text("content").notNull(),
  coverImageUrl: text("cover_image_url"),
  category: text("category"),
  status: articleStatusEnum("status").notNull().default("PENDING"),
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  reviewedById: integer("reviewed_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  rejectionReason: text("rejection_reason"),
  viewCount: integer("view_count").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Article = typeof articlesTable.$inferSelect;
