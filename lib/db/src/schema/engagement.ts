import { pgTable, text, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { newsTable } from "./news";
import { articlesTable } from "./articles";

// Reaction types (validated in code + Zod): LIKE, LOVE, SUPPORT, THANKS, INSIGHTFUL
export const newsReactionsTable = pgTable(
  "news_reactions",
  {
    id: serial("id").primaryKey(),
    newsId: integer("news_id").references(() => newsTable.id, { onDelete: "cascade" }).notNull(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    reactionType: text("reaction_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    newsUserUnique: unique("news_reactions_news_user_unique").on(t.newsId, t.userId),
  }),
);

export const articleReactionsTable = pgTable(
  "article_reactions",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id").references(() => articlesTable.id, { onDelete: "cascade" }).notNull(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    reactionType: text("reaction_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    articleUserUnique: unique("article_reactions_article_user_unique").on(t.articleId, t.userId),
  }),
);

// Chat presence (polling-based). roomType: PUBLIC_CHAT | ADMIN_DIRECT_CHAT
// roomKey: "PUBLIC" for public chat; conversationUserId (as string) for admin-direct chat.
export const chatPresenceTable = pgTable(
  "chat_presence",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    roomType: text("room_type").notNull(),
    roomKey: text("room_key").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    presenceUnique: unique("chat_presence_user_room_unique").on(t.userId, t.roomType, t.roomKey),
  }),
);

export type NewsReaction = typeof newsReactionsTable.$inferSelect;
export type ArticleReaction = typeof articleReactionsTable.$inferSelect;
export type ChatPresence = typeof chatPresenceTable.$inferSelect;
