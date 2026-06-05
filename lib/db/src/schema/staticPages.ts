import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const staticPagesTable = pgTable("static_pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  updatedById: integer("updated_by_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type StaticPage = typeof staticPagesTable.$inferSelect;
