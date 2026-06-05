import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const boardMembersTable = pgTable("board_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  bio: text("bio").notNull(),
  phone: text("phone"),
  email: text("email"),
  imageUrl: text("image_url"),
  boardType: text("board_type").notNull().default("CURRENT"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdById: integer("created_by_id"),
  updatedById: integer("updated_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type BoardMember = typeof boardMembersTable.$inferSelect;
