import { Router } from "express";
import { db, broadcastMessagesTable } from "@workspace/db";
import { eq, and, or, gt, isNull, sql } from "drizzle-orm";
import { CreateBroadcastBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const STAFF_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

function isStaff(role: string): boolean {
  return STAFF_ROLES.includes(role);
}

type BroadcastRow = typeof broadcastMessagesTable.$inferSelect;

function formatBroadcast(row: BroadcastRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    authorId: row.authorId,
    isActive: row.isActive,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// List active, non-expired broadcasts (newest first) — any authenticated user
router.get("/broadcasts/active", requireAuth, async (req, res): Promise<void> => {
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(broadcastMessagesTable)
      .where(
        and(
          eq(broadcastMessagesTable.isActive, true),
          or(
            isNull(broadcastMessagesTable.expiresAt),
            gt(broadcastMessagesTable.expiresAt, now),
          ),
        ),
      )
      .orderBy(sql`${broadcastMessagesTable.createdAt} DESC`, sql`${broadcastMessagesTable.id} DESC`)
      .limit(3);

    res.json(rows.map(formatBroadcast));
  } catch (err) {
    req.log.error({ err }, "Get active broadcasts error");
    res.status(500).json({ error: "تعذر تحميل التنبيهات، يرجى المحاولة لاحقاً" });
  }
});

// Create a broadcast (staff only)
router.post("/broadcasts", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
    return;
  }

  const parsed = CreateBroadcastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات البث غير صحيحة" });
    return;
  }

  const { title, content, expiresAt } = parsed.data;

  let expiresAtDate: Date | null = null;
  if (expiresAt !== undefined && expiresAt !== null && expiresAt.trim() !== "") {
    const parsedDate = new Date(expiresAt);
    if (Number.isNaN(parsedDate.getTime())) {
      res.status(400).json({ error: "تاريخ انتهاء الظهور غير صالح" });
      return;
    }
    expiresAtDate = parsedDate;
  }

  try {
    const [created] = await db
      .insert(broadcastMessagesTable)
      .values({
        title: title.trim(),
        content: content.trim(),
        expiresAt: expiresAtDate,
        isActive: true,
        authorId: req.user!.userId,
      })
      .returning();

    res.status(201).json(formatBroadcast(created));
  } catch (err) {
    req.log.error({ err }, "Create broadcast error");
    res.status(500).json({ error: "تعذر إرسال البث" });
  }
});

export default router;
