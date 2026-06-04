import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const publicChatMessagesTable = pgTable("public_chat_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminDirectChatMessagesTable = pgTable("admin_direct_chat_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  recipientId: integer("recipient_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PublicChatMessage = typeof publicChatMessagesTable.$inferSelect;
export type AdminDirectChatMessage = typeof adminDirectChatMessagesTable.$inferSelect;
