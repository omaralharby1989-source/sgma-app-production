import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const broadcastMessagesTable = pgTable("broadcast_messages", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const advertisementsTable = pgTable("advertisements", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type BroadcastMessage = typeof broadcastMessagesTable.$inferSelect;
export type Advertisement = typeof advertisementsTable.$inferSelect;
