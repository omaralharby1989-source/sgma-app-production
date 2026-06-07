import { Router } from "express";
import { db, newsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { CreateNewsBody, UpdateNewsBody, SetNewsReactionBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { validateImageSource } from "../lib/imageValidation";
import {
  getNewsReactionData,
  setNewsReaction,
  isReactionType,
  type ReactionData,
} from "../lib/reactions";

const router = Router();

const STAFF_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

function isStaff(role: string): boolean {
  return STAFF_ROLES.includes(role);
}

type NewsRow = typeof newsTable.$inferSelect;

const EMPTY_REACTION: ReactionData = {
  summary: { total: 0, counts: { LIKE: 0, LOVE: 0, SUPPORT: 0, THANKS: 0, INSIGHTFUL: 0 } },
  myReaction: null,
};

function formatNews(row: NewsRow, reaction: ReactionData = EMPTY_REACTION) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    imageUrl: row.coverImageUrl,
    category: row.category,
    status: row.status,
    authorId: row.authorId,
    viewCount: row.viewCount,
    reactionSummary: reaction.summary,
    myReaction: reaction.myReaction,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// List published news, newest first
router.get("/news", requireAuth, async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(newsTable)
      .where(eq(newsTable.status, "PUBLISHED"))
      .orderBy(sql`${newsTable.publishedAt} DESC NULLS LAST`, sql`${newsTable.id} DESC`)
      .limit(100);

    const reactionData = await getNewsReactionData(rows.map((r) => r.id), req.user!.userId);
    res.json(rows.map((r) => formatNews(r, reactionData.get(r.id))));
  } catch (err) {
    req.log.error({ err }, "Get news list error");
    res.status(500).json({ error: "تعذر تحميل الأخبار، يرجى المحاولة لاحقاً" });
  }
});

// Get one published news item
router.get("/news/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الخبر غير صالح" });
    return;
  }

  try {
    const [row] = await db
      .update(newsTable)
      .set({ viewCount: sql`${newsTable.viewCount} + 1` })
      .where(and(eq(newsTable.id, id), eq(newsTable.status, "PUBLISHED")))
      .returning();

    if (!row) {
      res.status(404).json({ error: "الخبر غير موجود أو لم يعد متاحاً" });
      return;
    }

    const reactionData = await getNewsReactionData([row.id], req.user!.userId);
    res.json(formatNews(row, reactionData.get(row.id)));
  } catch (err) {
    req.log.error({ err }, "Get news item error");
    res.status(500).json({ error: "تعذر تحميل الخبر، يرجى المحاولة لاحقاً" });
  }
});

// Set/change/remove the authenticated user's reaction on a news item
router.post("/news/:id/reaction", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الخبر غير صالح" });
    return;
  }

  const parsed = SetNewsReactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "نوع التفاعل غير صالح" });
    return;
  }

  const target = parsed.data.reactionType ?? null;
  if (target !== null && !isReactionType(target)) {
    res.status(400).json({ error: "نوع التفاعل غير صالح" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(newsTable)
      .where(and(eq(newsTable.id, id), eq(newsTable.status, "PUBLISHED")))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "الخبر غير موجود أو لم يعد متاحاً" });
      return;
    }

    await setNewsReaction(id, req.user!.userId, target);
    const reactionData = await getNewsReactionData([id], req.user!.userId);
    const data = reactionData.get(id) ?? EMPTY_REACTION;
    res.json({ summary: data.summary, myReaction: data.myReaction });
  } catch (err) {
    req.log.error({ err }, "Set news reaction error");
    res.status(500).json({ error: "تعذر تسجيل التفاعل، يرجى المحاولة لاحقاً" });
  }
});

// Create news (staff only)
router.post("/news", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
    return;
  }

  const parsed = CreateNewsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات الخبر غير صحيحة" });
    return;
  }

  const { title, summary, content, imageUrl, category, status } = parsed.data;

  const imageError = validateImageSource(imageUrl);
  if (imageError) {
    res.status(400).json({ error: imageError });
    return;
  }

  const finalStatus = status ?? "DRAFT";
  const isPublished = finalStatus === "PUBLISHED";

  try {
    const [created] = await db
      .insert(newsTable)
      .values({
        title: title.trim(),
        summary: summary?.trim() || null,
        content: content.trim(),
        coverImageUrl: imageUrl?.trim() || null,
        category: category?.trim() || null,
        status: finalStatus,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        authorId: req.user!.userId,
      })
      .returning();

    res.status(201).json(formatNews(created));
  } catch (err) {
    req.log.error({ err }, "Create news error");
    res.status(500).json({ error: "تعذر إنشاء الخبر" });
  }
});

// Update news (staff only)
router.patch("/news/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الخبر غير صالح" });
    return;
  }

  const parsed = UpdateNewsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات الخبر غير صحيحة" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(newsTable)
      .where(eq(newsTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "الخبر غير موجود أو لم يعد متاحاً" });
      return;
    }

    const { title, summary, content, imageUrl, category, status } = parsed.data;

    if (imageUrl !== undefined) {
      const imageError = validateImageSource(imageUrl);
      if (imageError) {
        res.status(400).json({ error: imageError });
        return;
      }
    }

    const updates: Partial<typeof newsTable.$inferInsert> = {};

    if (title !== undefined) updates.title = title.trim();
    if (summary !== undefined) updates.summary = summary.trim() || null;
    if (content !== undefined) updates.content = content.trim();
    if (imageUrl !== undefined) updates.coverImageUrl = imageUrl.trim() || null;
    if (category !== undefined) updates.category = category.trim() || null;

    if (status !== undefined) {
      updates.status = status;
      updates.isPublished = status === "PUBLISHED";
      if (status === "PUBLISHED" && !existing.publishedAt) {
        updates.publishedAt = new Date();
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "لا توجد بيانات للتعديل" });
      return;
    }

    const [updated] = await db
      .update(newsTable)
      .set(updates)
      .where(eq(newsTable.id, id))
      .returning();

    res.json(formatNews(updated));
  } catch (err) {
    req.log.error({ err }, "Update news error");
    res.status(500).json({ error: "تعذر تعديل الخبر" });
  }
});

// Delete news (staff only)
router.delete("/news/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الخبر غير صالح" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(newsTable)
      .where(eq(newsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "الخبر غير موجود أو لم يعد متاحاً" });
      return;
    }

    res.json({ message: "تم حذف الخبر" });
  } catch (err) {
    req.log.error({ err }, "Delete news error");
    res.status(500).json({ error: "تعذر حذف الخبر" });
  }
});

export default router;
