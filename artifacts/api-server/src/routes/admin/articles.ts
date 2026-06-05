import { Router } from "express";
import { db, articlesTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../../middlewares/auth";
import { isStaff } from "../../lib/permissions";

const router = Router();

const VALID_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "ARCHIVED"];

type ArticleRow = typeof articlesTable.$inferSelect;

function formatArticle(row: ArticleRow, authorName: string | null) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    imageUrl: row.coverImageUrl,
    category: row.category,
    status: row.status,
    authorId: row.authorId,
    authorName: authorName ?? null,
    reviewedById: row.reviewedById,
    rejectionReason: row.rejectionReason,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// List articles of all statuses (staff only); optional ?status filter
router.get("/admin/articles", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة المقالات" });
    return;
  }

  try {
    const statusFilter = typeof req.query.status === "string" ? req.query.status : "";

    const base = db
      .select({ article: articlesTable, authorName: usersTable.fullName })
      .from(articlesTable)
      .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id));

    const rows =
      statusFilter && VALID_STATUSES.includes(statusFilter)
        ? await base
            .where(eq(articlesTable.status, statusFilter as ArticleRow["status"]))
            .orderBy(sql`${articlesTable.createdAt} DESC`, sql`${articlesTable.id} DESC`)
            .limit(300)
        : await base
            .orderBy(sql`${articlesTable.createdAt} DESC`, sql`${articlesTable.id} DESC`)
            .limit(300);

    res.json(rows.map((r) => formatArticle(r.article, r.authorName)));
  } catch (err) {
    req.log.error({ err }, "Admin list articles error");
    res.status(500).json({ error: "تعذر تحميل المقالات" });
  }
});

// Archive an article (staff only)
router.post("/admin/articles/:id/archive", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المقال غير صالح" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "المقال غير موجود أو لم يعد متاحاً" });
      return;
    }

    const [updated] = await db
      .update(articlesTable)
      .set({
        status: "ARCHIVED",
        isPublished: false,
        reviewedById: req.user!.userId,
      })
      .where(eq(articlesTable.id, id))
      .returning();

    res.json(formatArticle(updated, null));
  } catch (err) {
    req.log.error({ err }, "Admin archive article error");
    res.status(500).json({ error: "تعذر أرشفة المقال" });
  }
});

export default router;
