import { pgTable, text, serial, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const newsStatusEnum = pgEnum("news_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const newsTable = pgTable("news", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  coverImageUrl: text("cover_image_url"),
  sourceUrl: text("source_url"),
  category: text("category"),
  status: newsStatusEnum("status").notNull().default("DRAFT"),
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  viewCount: integer("view_count").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type News = typeof newsTable.$inferSelect;
