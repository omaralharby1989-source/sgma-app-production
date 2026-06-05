import { Router } from "express";
import { db, broadcastMessagesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateAdminBroadcastBody, UpdateAdminBroadcastBody } from "@workspace/api-zod";
import { requireAuth } from "../../middlewares/auth";
import { isAdminOrSuper } from "../../lib/permissions";

const router = Router();

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

function parseExpiry(value: string | null | undefined, res: import("express").Response): { ok: true; date: Date | null } | { ok: false } {
  if (value === undefined) return { ok: true, date: null };
  if (value === null || value.trim() === "") return { ok: true, date: null };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    res.status(400).json({ error: "تاريخ انتهاء الظهور غير صالح" });
    return { ok: false };
  }
  return { ok: true, date: d };
}

// List all broadcasts (admin/super only)
router.get("/admin/broadcasts", requireAuth, async (req, res): Promise<void> => {
  if (!isAdminOrSuper(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة البث" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(broadcastMessagesTable)
      .orderBy(sql`${broadcastMessagesTable.createdAt} DESC`, sql`${broadcastMessagesTable.id} DESC`)
      .limit(200);

    res.json(rows.map(formatBroadcast));
  } catch (err) {
    req.log.error({ err }, "Admin list broadcasts error");
    res.status(500).json({ error: "تعذر تحميل رسائل البث" });
  }
});

// Create a broadcast (admin/super only)
router.post("/admin/broadcasts", requireAuth, async (req, res): Promise<void> => {
  if (!isAdminOrSuper(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة البث" });
    return;
  }

  const parsed = CreateAdminBroadcastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات البث غير صحيحة" });
    return;
  }

  const expiry = parseExpiry(parsed.data.expiresAt, res);
  if (!expiry.ok) return;

  try {
    const [created] = await db
      .insert(broadcastMessagesTable)
      .values({
        title: parsed.data.title.trim(),
        content: parsed.data.content.trim(),
        expiresAt: expiry.date,
        isActive: true,
        authorId: req.user!.userId,
      })
      .returning();

    res.status(201).json(formatBroadcast(created));
  } catch (err) {
    req.log.error({ err }, "Admin create broadcast error");
    res.status(500).json({ error: "تعذر إرسال البث" });
  }
});

// Update / activate / deactivate a broadcast (admin/super only)
router.patch("/admin/broadcasts/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isAdminOrSuper(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة البث" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف البث غير صالح" });
    return;
  }

  const parsed = UpdateAdminBroadcastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات البث غير صحيحة" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(broadcastMessagesTable)
      .where(eq(broadcastMessagesTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "رسالة البث غير موجودة" });
      return;
    }

    const d = parsed.data;
    const updates: Partial<typeof broadcastMessagesTable.$inferInsert> = {};

    if (d.title !== undefined) updates.title = d.title.trim();
    if (d.content !== undefined) updates.content = d.content.trim();
    if (d.isActive !== undefined) updates.isActive = d.isActive;
    if (d.expiresAt !== undefined) {
      const expiry = parseExpiry(d.expiresAt, res);
      if (!expiry.ok) return;
      updates.expiresAt = expiry.date;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "لا توجد بيانات للتعديل" });
      return;
    }

    const [updated] = await db
      .update(broadcastMessagesTable)
      .set(updates)
      .where(eq(broadcastMessagesTable.id, id))
      .returning();

    res.json(formatBroadcast(updated));
  } catch (err) {
    req.log.error({ err }, "Admin update broadcast error");
    res.status(500).json({ error: "تعذر تعديل البث" });
  }
});

// Delete a broadcast (admin/super only)
router.delete("/admin/broadcasts/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isAdminOrSuper(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة البث" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف البث غير صالح" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(broadcastMessagesTable)
      .where(eq(broadcastMessagesTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "رسالة البث غير موجودة" });
      return;
    }

    res.json({ message: "تم حذف رسالة البث" });
  } catch (err) {
    req.log.error({ err }, "Admin delete broadcast error");
    res.status(500).json({ error: "تعذر حذف البث" });
  }
});

export default router;
