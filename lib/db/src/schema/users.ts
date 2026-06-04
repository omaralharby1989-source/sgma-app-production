import { pgTable, text, serial, timestamp, pgEnum, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", ["MEMBER", "MODERATOR", "ADMIN", "SUPER_ADMIN"]);
export const statusEnum = pgEnum("status", ["PENDING", "ACTIVE", "SUSPENDED"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  account: text("account").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: roleEnum("role").notNull().default("MEMBER"),
  status: statusEnum("status").notNull().default("PENDING"),
  isDeveloper: boolean("is_developer").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  birthDate: date("birth_date"),
  address: text("address"),
  professionGroup: text("profession_group"),
  specialtyText: text("specialty_text"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
