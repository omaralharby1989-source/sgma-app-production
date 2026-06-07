import { Router } from "express";
import { db, articlesTable, usersTable } from "@workspace/db";
import { eq, and, or, sql } from "drizzle-orm";
import { CreateArticleBody, UpdateArticleBody, RejectArticleBody, SetArticleReactionBody } from "@workspace/api-zod";
import { requireAuth, requireFullApp } from "../middlewares/auth";
import { validateImageSource } from "../lib/imageValidation";
import {
  getArticleReactionData,
  setArticleReaction,
  isReactionType,
  type ReactionData,
} from "../lib/reactions";

const router = Router();

const STAFF_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

function isStaff(role: string): boolean {
  return STAFF_ROLES.includes(role);
}

type ArticleRow = typeof articlesTable.$inferSelect;

const EMPTY_REACTION: ReactionData = {
  summary: { total: 0, counts: { LIKE: 0, LOVE: 0, SUPPORT: 0, THANKS: 0, INSIGHTFUL: 0 } },
  myReaction: null,
};

function formatArticle(row: ArticleRow, authorName: string | null, reaction: ReactionData = EMPTY_REACTION) {
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
    viewCount: row.viewCount,
    reactionSummary: reaction.summary,
    myReaction: reaction.myReaction,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// List approved (public) articles, newest first
router.get("/articles", requireAuth, async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select({ article: articlesTable, authorName: usersTable.fullName })
      .from(articlesTable)
      .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
      .where(eq(articlesTable.status, "APPROVED"))
      .orderBy(sql`${articlesTable.publishedAt} DESC NULLS LAST`, sql`${articlesTable.id} DESC`)
      .limit(100);

    const reactionData = await getArticleReactionData(rows.map((r) => r.article.id), req.user!.userId);
    res.json(rows.map((r) => formatArticle(r.article, r.authorName, reactionData.get(r.article.id))));
  } catch (err) {
    req.log.error({ err }, "Get articles list error");
    res.status(500).json({ error: "تعذر تحميل المقالات، يرجى المحاولة لاحقاً" });
  }
});

// List current user's articles (all statuses), newest first
router.get("/articles/my", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select({ article: articlesTable, authorName: usersTable.fullName })
      .from(articlesTable)
      .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
      .where(eq(articlesTable.authorId, req.user!.userId))
      .orderBy(sql`${articlesTable.createdAt} DESC`, sql`${articlesTable.id} DESC`)
      .limit(200);

    const reactionData = await getArticleReactionData(rows.map((r) => r.article.id), req.user!.userId);
    res.json(rows.map((r) => formatArticle(r.article, r.authorName, reactionData.get(r.article.id))));
  } catch (err) {
    req.log.error({ err }, "Get my articles error");
    res.status(500).json({ error: "تعذر تحميل المقالات، يرجى المحاولة لاحقاً" });
  }
});

// Get one article: approved for anyone; author can view own non-approved
router.get("/articles/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المقال غير صالح" });
    return;
  }

  try {
    const [row] = await db
      .select({ article: articlesTable, authorName: usersTable.fullName })
      .from(articlesTable)
      .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
      .where(eq(articlesTable.id, id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "المقال غير موجود أو لم يعد متاحاً" });
      return;
    }

    const isApproved = row.article.status === "APPROVED";
    const isOwner = row.article.authorId === req.user!.userId;
    const isStaffViewer = isStaff(req.user!.role);

    if (!isApproved && !isOwner && !isStaffViewer) {
      res.status(404).json({ error: "المقال غير موجود أو لم يعد متاحاً" });
      return;
    }

    // Count a view only for publicly-readable (APPROVED) articles. The status
    // is re-checked in the UPDATE WHERE clause so a concurrent status change
    // can never let a non-approved article accrue views.
    let article = row.article;
    if (isApproved) {
      const [bumped] = await db
        .update(articlesTable)
        .set({ viewCount: sql`${articlesTable.viewCount} + 1` })
        .where(and(eq(articlesTable.id, id), eq(articlesTable.status, "APPROVED")))
        .returning();
      if (bumped) article = bumped;
    }

    const reactionData = await getArticleReactionData([id], req.user!.userId);
    res.json(formatArticle(article, row.authorName, reactionData.get(id)));
  } catch (err) {
    req.log.error({ err }, "Get article error");
    res.status(500).json({ error: "تعذر تحميل المقال، يرجى المحاولة لاحقاً" });
  }
});

// Set/change/remove the authenticated user's reaction on an article.
// Allowed for any authenticated user (incl. SY academy) on APPROVED articles.
router.post("/articles/:id/reaction", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المقال غير صالح" });
    return;
  }

  const parsed = SetArticleReactionBody.safeParse(req.body);
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
    const [existing] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, id))
      .limit(1);

    if (!existing || existing.status !== "APPROVED") {
      res.status(404).json({ error: "المقال غير موجود أو لم يعد متاحاً" });
      return;
    }

    await setArticleReaction(id, req.user!.userId, target);
    const reactionData = await getArticleReactionData([id], req.user!.userId);
    const data = reactionData.get(id) ?? EMPTY_REACTION;
    res.json({ summary: data.summary, myReaction: data.myReaction });
  } catch (err) {
    req.log.error({ err }, "Set article reaction error");
    res.status(500).json({ error: "تعذر تسجيل التفاعل، يرجى المحاولة لاحقاً" });
  }
});

// Create article (any authenticated user). Default status PENDING (review).
router.post("/articles", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  const parsed = CreateArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات المقال غير صحيحة" });
    return;
  }

  const { title, summary, content, category, imageUrl, status } = parsed.data;

  const imageError = validateImageSource(imageUrl);
  if (imageError) {
    res.status(400).json({ error: imageError });
    return;
  }

  // Author controls only DRAFT vs PENDING; never APPROVED/REJECTED/ARCHIVED.
  const finalStatus = status === "DRAFT" ? "DRAFT" : "PENDING";

  try {
    const [created] = await db
      .insert(articlesTable)
      .values({
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        category: category?.trim() || null,
        coverImageUrl: imageUrl?.trim() || null,
        status: finalStatus,
        authorId: req.user!.userId,
        isPublished: false,
        publishedAt: null,
      })
      .returning();

    res.status(201).json(formatArticle(created, null));
  } catch (err) {
    req.log.error({ err }, "Create article error");
    res.status(500).json({ error: "تعذر إنشاء المقال" });
  }
});

// Update own article (only when DRAFT or PENDING)
router.patch("/articles/:id", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المقال غير صالح" });
    return;
  }

  const parsed = UpdateArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات المقال غير صحيحة" });
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

    if (existing.authorId !== req.user!.userId) {
      res.status(403).json({ error: "ليس لديك صلاحية لتعديل هذا المقال" });
      return;
    }

    if (existing.status !== "DRAFT" && existing.status !== "PENDING") {
      res.status(403).json({ error: "لا يمكن تعديل المقال في حالته الحالية" });
      return;
    }

    const { title, summary, content, category, imageUrl, status } = parsed.data;

    if (imageUrl !== undefined) {
      const imageError = validateImageSource(imageUrl);
      if (imageError) {
        res.status(400).json({ error: imageError });
        return;
      }
    }

    const updates: Partial<typeof articlesTable.$inferInsert> = {};

    if (title !== undefined) updates.title = title.trim();
    if (summary !== undefined) updates.summary = summary.trim();
    if (content !== undefined) updates.content = content.trim();
    if (category !== undefined) updates.category = category.trim() || null;
    if (imageUrl !== undefined) updates.coverImageUrl = imageUrl.trim() || null;
    // Author may only switch between DRAFT and PENDING (no escalation).
    if (status === "DRAFT" || status === "PENDING") updates.status = status;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "لا توجد بيانات للتعديل" });
      return;
    }

    const [updated] = await db
      .update(articlesTable)
      .set(updates)
      .where(eq(articlesTable.id, id))
      .returning();

    res.json(formatArticle(updated, null));
  } catch (err) {
    req.log.error({ err }, "Update article error");
    res.status(500).json({ error: "تعذر تعديل المقال" });
  }
});

// Archive own article (soft delete; only when DRAFT or PENDING)
router.delete("/articles/:id", requireAuth, requireFullApp, async (req, res): Promise<void> => {
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

    if (existing.authorId !== req.user!.userId) {
      res.status(403).json({ error: "ليس لديك صلاحية لحذف هذا المقال" });
      return;
    }

    if (existing.status !== "DRAFT" && existing.status !== "PENDING") {
      res.status(403).json({ error: "لا يمكن حذف المقال في حالته الحالية" });
      return;
    }

    await db
      .update(articlesTable)
      .set({ status: "ARCHIVED", isPublished: false })
      .where(eq(articlesTable.id, id));

    res.json({ message: "تم أرشفة المقال" });
  } catch (err) {
    req.log.error({ err }, "Delete article error");
    res.status(500).json({ error: "تعذر حذف المقال" });
  }
});

// Approve article (staff only) — backend only, no admin UI in this phase
router.post("/articles/:id/approve", requireAuth, requireFullApp, async (req, res): Promise<void> => {
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
        status: "APPROVED",
        isPublished: true,
        publishedAt: existing.publishedAt ?? new Date(),
        reviewedById: req.user!.userId,
        rejectionReason: null,
      })
      .where(eq(articlesTable.id, id))
      .returning();

    res.json(formatArticle(updated, null));
  } catch (err) {
    req.log.error({ err }, "Approve article error");
    res.status(500).json({ error: "تعذر اعتماد المقال" });
  }
});

// Reject article (staff only) — backend only, no admin UI in this phase
router.post("/articles/:id/reject", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المقال غير صالح" });
    return;
  }

  const parsed = RejectArticleBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات الرفض غير صحيحة" });
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
        status: "REJECTED",
        isPublished: false,
        publishedAt: null,
        reviewedById: req.user!.userId,
        rejectionReason: parsed.data.reason?.trim() || null,
      })
      .where(eq(articlesTable.id, id))
      .returning();

    res.json(formatArticle(updated, null));
  } catch (err) {
    req.log.error({ err }, "Reject article error");
    res.status(500).json({ error: "تعذر رفض المقال" });
  }
});

export default router;
