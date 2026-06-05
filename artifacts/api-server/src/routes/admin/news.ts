import { Router } from "express";
import { db, newsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../../middlewares/auth";
import { isStaff } from "../../lib/permissions";

const router = Router();

const VALID_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];

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

// List news of all statuses (staff only); optional ?status filter
router.get("/admin/news", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة الأخبار" });
    return;
  }

  try {
    const statusFilter = typeof req.query.status === "string" ? req.query.status : "";

    const base = db.select().from(newsTable);
    const rows =
      statusFilter && VALID_STATUSES.includes(statusFilter)
        ? await base
            .where(eq(newsTable.status, statusFilter as NewsRow["status"]))
            .orderBy(sql`${newsTable.createdAt} DESC`, sql`${newsTable.id} DESC`)
            .limit(300)
        : await base
            .orderBy(sql`${newsTable.createdAt} DESC`, sql`${newsTable.id} DESC`)
            .limit(300);

    res.json(rows.map(formatNews));
  } catch (err) {
    req.log.error({ err }, "Admin list news error");
    res.status(500).json({ error: "تعذر تحميل الأخبار" });
  }
});

// Get one news item of any status (staff only)
router.get("/admin/news/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة الأخبار" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الخبر غير صالح" });
    return;
  }

  try {
    const [row] = await db.select().from(newsTable).where(eq(newsTable.id, id)).limit(1);
    if (!row) {
      res.status(404).json({ error: "الخبر غير موجود أو لم يعد متاحاً" });
      return;
    }
    res.json(formatNews(row));
  } catch (err) {
    req.log.error({ err }, "Admin get news item error");
    res.status(500).json({ error: "تعذر تحميل الخبر" });
  }
});

export default router;
