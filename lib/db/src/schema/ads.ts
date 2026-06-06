import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const adSettingsTable = pgTable("ad_settings", {
  id: serial("id").primaryKey(),
  adsEnabled: boolean("ads_enabled").notNull().default(false),
  googleAdsEnabled: boolean("google_ads_enabled").notNull().default(false),
  googlePublisherId: text("google_publisher_id"),
  googleAdSlotBottom: text("google_ad_slot_bottom"),
  showOnHome: boolean("show_on_home").notNull().default(false),
  showOnNews: boolean("show_on_news").notNull().default(true),
  showOnArticles: boolean("show_on_articles").notNull().default(true),
  showOnBoard: boolean("show_on_board").notNull().default(true),
  showOnMore: boolean("show_on_more").notNull().default(true),
  showOnStaticPages: boolean("show_on_static_pages").notNull().default(true),
  showOnChat: boolean("show_on_chat").notNull().default(false),
  showOnAdmin: boolean("show_on_admin").notNull().default(false),
  showOnAuthPages: boolean("show_on_auth_pages").notNull().default(false),
  updatedById: integer("updated_by_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const customAdsTable = pgTable("custom_ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  placement: text("placement").notNull().default("GLOBAL_BOTTOM"),
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  createdById: integer("created_by_id"),
  updatedById: integer("updated_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type AdSettings = typeof adSettingsTable.$inferSelect;
export type CustomAd = typeof customAdsTable.$inferSelect;
