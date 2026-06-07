import { Router } from "express";
import { db, adSettingsTable, customAdsTable } from "@workspace/db";
import { and, or, eq, isNull, lte, gte, inArray, sql } from "drizzle-orm";
import { requireAuth, requireFullApp } from "../middlewares/auth";

const router = Router();

type SettingsRow = typeof adSettingsTable.$inferSelect;

export const ALLOWED_PLACEMENTS = [
  "GLOBAL_BOTTOM",
  "HOME_BOTTOM",
  "NEWS_BOTTOM",
  "ARTICLES_BOTTOM",
  "BOARD_BOTTOM",
  "MORE_BOTTOM",
  "STATIC_PAGES_BOTTOM",
] as const;

// Self-seed the single ad-settings row so reads never 404 on a fresh DB.
export async function ensureSettingsRow(): Promise<SettingsRow> {
  const [existing] = await db.select().from(adSettingsTable).orderBy(adSettingsTable.id).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(adSettingsTable).values({}).returning();
  return created;
}

export function formatSettings(row: SettingsRow) {
  return {
    id: row.id,
    adsEnabled: row.adsEnabled,
    googleAdsEnabled: row.googleAdsEnabled,
    googlePublisherId: row.googlePublisherId,
    googleAdSlotBottom: row.googleAdSlotBottom,
    showOnHome: row.showOnHome,
    showOnNews: row.showOnNews,
    showOnArticles: row.showOnArticles,
    showOnBoard: row.showOnBoard,
    showOnMore: row.showOnMore,
    showOnStaticPages: row.showOnStaticPages,
    showOnChat: row.showOnChat,
    showOnAdmin: row.showOnAdmin,
    showOnAuthPages: row.showOnAuthPages,
    updatedById: row.updatedById,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

// Ad settings + active custom ads for a placement. Any authenticated user.
router.get("/ads/active", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  try {
    const settings = await ensureSettingsRow();

    const rawPlacement = typeof req.query.placement === "string" ? req.query.placement : "";
    const placements = new Set<string>(["GLOBAL_BOTTOM"]);
    if ((ALLOWED_PLACEMENTS as readonly string[]).includes(rawPlacement)) {
      placements.add(rawPlacement);
    }

    let ads: {
      id: number;
      title: string;
      content: string;
      imageUrl: string | null;
      linkUrl: string | null;
      placement: string;
    }[] = [];

    // Only surface ads when the master switch is on.
    if (settings.adsEnabled) {
      const now = new Date();
      const rows = await db
        .select()
        .from(customAdsTable)
        .where(
          and(
            eq(customAdsTable.isActive, true),
            inArray(customAdsTable.placement, Array.from(placements)),
            or(isNull(customAdsTable.startAt), lte(customAdsTable.startAt, now)),
            or(isNull(customAdsTable.endAt), gte(customAdsTable.endAt, now)),
          ),
        )
        .orderBy(
          sql`${customAdsTable.priority} DESC`,
          sql`${customAdsTable.createdAt} DESC`,
          sql`${customAdsTable.id} DESC`,
        )
        .limit(10);

      ads = rows.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        imageUrl: r.imageUrl,
        linkUrl: r.linkUrl,
        placement: r.placement,
      }));
    }

    res.json({
      adsEnabled: settings.adsEnabled,
      googleAdsEnabled: settings.googleAdsEnabled,
      showOnHome: settings.showOnHome,
      showOnNews: settings.showOnNews,
      showOnArticles: settings.showOnArticles,
      showOnBoard: settings.showOnBoard,
      showOnMore: settings.showOnMore,
      showOnStaticPages: settings.showOnStaticPages,
      showOnChat: settings.showOnChat,
      showOnAdmin: settings.showOnAdmin,
      showOnAuthPages: settings.showOnAuthPages,
      ads,
    });
  } catch (err) {
    req.log.error({ err }, "Get active ads error");
    res.status(500).json({ error: "تعذر تحميل الإعلانات" });
  }
});

export default router;
