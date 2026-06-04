import { Router } from "express";
import { db, newsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { CreateNewsBody, UpdateNewsBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const STAFF_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

function isStaff(role: string): boolean {
  return STAFF_ROLES.includes(role);
}

type NewsRow = typeof newsTable.$inferSelect;

function formatNews(row: NewsRow) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    imageUrl: row.coverImageUrl,
    category: row.category,
    status: row.status,
    authorId: row.authorId,
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

    res.json(rows.map(formatNews));
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
      .select()
      .from(newsTable)
      .where(and(eq(newsTable.id, id), eq(newsTable.status, "PUBLISHED")))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "الخبر غير موجود أو لم يعد متاحاً" });
      return;
    }

    res.json(formatNews(row));
  } catch (err) {
    req.log.error({ err }, "Get news item error");
    res.status(500).json({ error: "تعذر تحميل الخبر، يرجى المحاولة لاحقاً" });
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
