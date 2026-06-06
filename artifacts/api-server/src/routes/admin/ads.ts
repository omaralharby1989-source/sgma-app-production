import { Router } from "express";
import { db, adSettingsTable, customAdsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  UpdateAdminAdSettingsBody,
  CreateAdminCustomAdBody,
  UpdateAdminCustomAdBody,
} from "@workspace/api-zod";
import { requireAuth } from "../../middlewares/auth";
import { isSuperAdmin } from "../../lib/permissions";
import { validateImageSource } from "../../lib/imageValidation";
import { ensureSettingsRow, formatSettings, ALLOWED_PLACEMENTS } from "../ads";

const router = Router();

type CustomAdRow = typeof customAdsTable.$inferSelect;

const FORBIDDEN = { error: "هذه الصفحة مخصصة للمدير العام فقط" };

function formatCustomAd(row: CustomAdRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    imageUrl: row.imageUrl,
    linkUrl: row.linkUrl,
    placement: row.placement,
    priority: row.priority,
    isActive: row.isActive,
    startAt: row.startAt ? row.startAt.toISOString() : null,
    endAt: row.endAt ? row.endAt.toISOString() : null,
    createdById: row.createdById,
    updatedById: row.updatedById,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

function parseOptionalDate(
  value: string | null | undefined,
  res: import("express").Response,
  label: string,
): { ok: true; date: Date | null } | { ok: false } {
  if (value === undefined || value === null || value.trim() === "") {
    return { ok: true, date: null };
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    res.status(400).json({ error: `${label} غير صالح` });
    return { ok: false };
  }
  return { ok: true, date: d };
}

function validateLinkUrl(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const v = value.trim();
  if (v === "") return null;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return "الرجاء إدخال رابط صحيح يبدأ بـ http أو https";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "الرجاء إدخال رابط صحيح يبدأ بـ http أو https";
  }
  return null;
}

// ---- Settings ----

router.get("/admin/ads/settings", requireAuth, async (req, res): Promise<void> => {
  if (!isSuperAdmin(req.user!.role)) {
    res.status(403).json(FORBIDDEN);
    return;
  }
  try {
    const settings = await ensureSettingsRow();
    res.json(formatSettings(settings));
  } catch (err) {
    req.log.error({ err }, "Get ad settings error");
    res.status(500).json({ error: "تعذر تحميل إعدادات الإعلانات" });
  }
});

router.patch("/admin/ads/settings", requireAuth, async (req, res): Promise<void> => {
  if (!isSuperAdmin(req.user!.role)) {
    res.status(403).json(FORBIDDEN);
    return;
  }

  const parsed = UpdateAdminAdSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات الإعدادات غير صحيحة" });
    return;
  }

  try {
    const current = await ensureSettingsRow();
    const d = parsed.data;
    const updates: Partial<typeof adSettingsTable.$inferInsert> = {};

    if (d.adsEnabled !== undefined) updates.adsEnabled = d.adsEnabled;
    if (d.googleAdsEnabled !== undefined) updates.googleAdsEnabled = d.googleAdsEnabled;
    if (d.googlePublisherId !== undefined) {
      const v = d.googlePublisherId === null ? null : d.googlePublisherId.trim();
      updates.googlePublisherId = v === "" ? null : v;
    }
    if (d.googleAdSlotBottom !== undefined) {
      const v = d.googleAdSlotBottom === null ? null : d.googleAdSlotBottom.trim();
      updates.googleAdSlotBottom = v === "" ? null : v;
    }
    if (d.showOnHome !== undefined) updates.showOnHome = d.showOnHome;
    if (d.showOnNews !== undefined) updates.showOnNews = d.showOnNews;
    if (d.showOnArticles !== undefined) updates.showOnArticles = d.showOnArticles;
    if (d.showOnBoard !== undefined) updates.showOnBoard = d.showOnBoard;
    if (d.showOnMore !== undefined) updates.showOnMore = d.showOnMore;
    if (d.showOnStaticPages !== undefined) updates.showOnStaticPages = d.showOnStaticPages;
    if (d.showOnChat !== undefined) updates.showOnChat = d.showOnChat;
    if (d.showOnAdmin !== undefined) updates.showOnAdmin = d.showOnAdmin;
    if (d.showOnAuthPages !== undefined) updates.showOnAuthPages = d.showOnAuthPages;

    updates.updatedById = req.user!.userId;

    const [updated] = await db
      .update(adSettingsTable)
      .set(updates)
      .where(eq(adSettingsTable.id, current.id))
      .returning();

    res.json(formatSettings(updated));
  } catch (err) {
    req.log.error({ err }, "Update ad settings error");
    res.status(500).json({ error: "تعذر حفظ إعدادات الإعلانات" });
  }
});

// ---- Custom ads ----

router.get("/admin/ads/custom", requireAuth, async (req, res): Promise<void> => {
  if (!isSuperAdmin(req.user!.role)) {
    res.status(403).json(FORBIDDEN);
    return;
  }
  try {
    const rows = await db
      .select()
      .from(customAdsTable)
      .orderBy(
        sql`${customAdsTable.priority} DESC`,
        sql`${customAdsTable.createdAt} DESC`,
        sql`${customAdsTable.id} DESC`,
      )
      .limit(200);
    res.json(rows.map(formatCustomAd));
  } catch (err) {
    req.log.error({ err }, "List custom ads error");
    res.status(500).json({ error: "تعذر تحميل الإعلانات" });
  }
});

router.post("/admin/ads/custom", requireAuth, async (req, res): Promise<void> => {
  if (!isSuperAdmin(req.user!.role)) {
    res.status(403).json(FORBIDDEN);
    return;
  }

  const parsed = CreateAdminCustomAdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات الإعلان غير صحيحة" });
    return;
  }

  const d = parsed.data;
  const title = d.title.trim();
  const content = d.content.trim();
  if (!title || !content) {
    res.status(400).json({ error: "العنوان والنص مطلوبان" });
    return;
  }
  if (!(ALLOWED_PLACEMENTS as readonly string[]).includes(d.placement)) {
    res.status(400).json({ error: "مكان الظهور غير صالح" });
    return;
  }

  const imgErr = validateImageSource(d.imageUrl);
  if (imgErr) {
    res.status(400).json({ error: imgErr });
    return;
  }
  const linkErr = validateLinkUrl(d.linkUrl);
  if (linkErr) {
    res.status(400).json({ error: linkErr });
    return;
  }

  const start = parseOptionalDate(d.startAt, res, "تاريخ البداية");
  if (!start.ok) return;
  const end = parseOptionalDate(d.endAt, res, "تاريخ النهاية");
  if (!end.ok) return;
  if (start.date && end.date && start.date.getTime() > end.date.getTime()) {
    res.status(400).json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" });
    return;
  }

  try {
    const imageUrl = d.imageUrl && d.imageUrl.trim() !== "" ? d.imageUrl.trim() : null;
    const linkUrl = d.linkUrl && d.linkUrl.trim() !== "" ? d.linkUrl.trim() : null;
    const [created] = await db
      .insert(customAdsTable)
      .values({
        title,
        content,
        imageUrl,
        linkUrl,
        placement: d.placement,
        priority: d.priority ?? 0,
        isActive: d.isActive ?? true,
        startAt: start.date,
        endAt: end.date,
        createdById: req.user!.userId,
      })
      .returning();
    res.status(201).json(formatCustomAd(created));
  } catch (err) {
    req.log.error({ err }, "Create custom ad error");
    res.status(500).json({ error: "تعذر إنشاء الإعلان" });
  }
});

router.patch("/admin/ads/custom/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isSuperAdmin(req.user!.role)) {
    res.status(403).json(FORBIDDEN);
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الإعلان غير صالح" });
    return;
  }

  const parsed = UpdateAdminCustomAdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات الإعلان غير صحيحة" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(customAdsTable)
      .where(eq(customAdsTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "الإعلان غير موجود" });
      return;
    }

    const d = parsed.data;
    const updates: Partial<typeof customAdsTable.$inferInsert> = {};

    if (d.title !== undefined) {
      const t = d.title.trim();
      if (!t) {
        res.status(400).json({ error: "العنوان مطلوب" });
        return;
      }
      updates.title = t;
    }
    if (d.content !== undefined) {
      const c = d.content.trim();
      if (!c) {
        res.status(400).json({ error: "النص مطلوب" });
        return;
      }
      updates.content = c;
    }
    if (d.placement !== undefined) {
      if (!(ALLOWED_PLACEMENTS as readonly string[]).includes(d.placement)) {
        res.status(400).json({ error: "مكان الظهور غير صالح" });
        return;
      }
      updates.placement = d.placement;
    }
    if (d.imageUrl !== undefined) {
      const imgErr = validateImageSource(d.imageUrl);
      if (imgErr) {
        res.status(400).json({ error: imgErr });
        return;
      }
      updates.imageUrl = d.imageUrl === null || d.imageUrl.trim() === "" ? null : d.imageUrl.trim();
    }
    if (d.linkUrl !== undefined) {
      const linkErr = validateLinkUrl(d.linkUrl);
      if (linkErr) {
        res.status(400).json({ error: linkErr });
        return;
      }
      updates.linkUrl = d.linkUrl === null || d.linkUrl.trim() === "" ? null : d.linkUrl.trim();
    }
    if (d.priority !== undefined) updates.priority = d.priority;
    if (d.isActive !== undefined) updates.isActive = d.isActive;

    let nextStart = existing.startAt;
    let nextEnd = existing.endAt;
    if (d.startAt !== undefined) {
      const start = parseOptionalDate(d.startAt, res, "تاريخ البداية");
      if (!start.ok) return;
      updates.startAt = start.date;
      nextStart = start.date;
    }
    if (d.endAt !== undefined) {
      const end = parseOptionalDate(d.endAt, res, "تاريخ النهاية");
      if (!end.ok) return;
      updates.endAt = end.date;
      nextEnd = end.date;
    }
    if (nextStart && nextEnd && nextStart.getTime() > nextEnd.getTime()) {
      res.status(400).json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" });
      return;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "لا توجد بيانات للتعديل" });
      return;
    }

    updates.updatedById = req.user!.userId;

    const [updated] = await db
      .update(customAdsTable)
      .set(updates)
      .where(eq(customAdsTable.id, id))
      .returning();
    res.json(formatCustomAd(updated));
  } catch (err) {
    req.log.error({ err }, "Update custom ad error");
    res.status(500).json({ error: "تعذر تعديل الإعلان" });
  }
});

router.delete("/admin/ads/custom/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isSuperAdmin(req.user!.role)) {
    res.status(403).json(FORBIDDEN);
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الإعلان غير صالح" });
    return;
  }

  try {
    const [updated] = await db
      .update(customAdsTable)
      .set({ isActive: false, updatedById: req.user!.userId })
      .where(eq(customAdsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "الإعلان غير موجود" });
      return;
    }
    res.json({ message: "تم إيقاف الإعلان" });
  } catch (err) {
    req.log.error({ err }, "Delete custom ad error");
    res.status(500).json({ error: "تعذر حذف الإعلان" });
  }
});

export default router;
