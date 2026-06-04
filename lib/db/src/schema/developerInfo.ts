import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

export const developerInfoTable = pgTable("developer_info", {
  id: serial("id").primaryKey(),
  appName: text("app_name").notNull(),
  version: text("version").notNull(),
  developer: text("developer").notNull(),
  description: text("description").notNull(),
  contact: text("contact").notNull(),
  builtWith: text("built_with").notNull().default("[]"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type DeveloperInfo = typeof developerInfoTable.$inferSelect;
