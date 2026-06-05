import { Router } from "express";
import { db, boardMembersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { CreateBoardMemberBody, UpdateBoardMemberBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { isAdminOrSuper } from "../lib/permissions";

const router = Router();

const BOARD_TYPES = ["CURRENT", "PREVIOUS", "HISTORY"] as const;
type BoardType = (typeof BOARD_TYPES)[number];

function isBoardType(v: string): v is BoardType {
  return (BOARD_TYPES as readonly string[]).includes(v);
}

type BoardRow = typeof boardMembersTable.$inferSelect;

const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB decoded
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validates an optional base64 data-URI image. Returns an Arabic error string
// when invalid, or null when acceptable (including empty/null which clears it).
function validateImageUrl(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === "") return null;
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(value.trim());
  if (!match) return "صيغة الصورة غير صالحة";
  const mime = match[1].toLowerCase();
  if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(mime)) {
    return "نوع الصورة غير مدعوم، يُسمح بصيغ JPG أو PNG أو WEBP فقط";
  }
  const b64 = match[2];
  // Decoded byte length from base64 length (account for padding).
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((b64.length * 3) / 4) - padding;
  if (bytes > MAX_IMAGE_BYTES) return "حجم الصورة يجب ألا يتجاوز 2 ميجابايت";
  return null;
}

function formatMember(row: BoardRow) {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    bio: row.bio,
    phone: row.phone ?? null,
    email: row.email ?? null,
    imageUrl: row.imageUrl ?? null,
    boardType: row.boardType,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

const SEED: Array<{
  name: string;
  position: string;
  bio: string;
  phone: string | null;
  email: string | null;
  displayOrder: number;
}> = [
  {
    name: "د. أحمد محمد",
    position: "رئيس مجلس الإدارة",
    bio: "رئيس مجلس إدارة الجمعية الطبية السورية الألمانية، يقود الرؤية الاستراتيجية ويشرف على تنسيق العمل بين اللجان المختلفة. (بيانات تجريبية)",
    phone: null,
    email: null,
    displayOrder: 1,
  },
  {
    name: "د. هدى خالد",
    position: "نائبة الرئيس",
    bio: "نائبة رئيس مجلس الإدارة، تدعم إدارة الأنشطة العلمية والإنسانية وتعزيز التعاون مع المؤسسات الطبية. (بيانات تجريبية)",
    phone: null,
    email: null,
    displayOrder: 2,
  },
  {
    name: "عمر الحربي",
    position: "عضو مجلس الإدارة",
    bio: "منسق عام لجنة المساعدين الطبيين والتمريض، وممرض اختصاص تخدير وعناية مركزة، يساهم في تطوير العمل التنظيمي والرقمي داخل SGMA.",
    phone: "017634443419",
    email: "lordhygm@gmail.com",
    displayOrder: 3,
  },
];

// Seeds 3 sample CURRENT members ONLY when the table is completely empty
// (no rows at all). Soft-deleted members keep their rows, so this never
// re-seeds after an admin deactivates members.
async function ensureSeeded(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(boardMembersTable);
  if (count > 0) return;
  await db.insert(boardMembersTable).values(
    SEED.map((m) => ({
      name: m.name,
      position: m.position,
      bio: m.bio,
      phone: m.phone,
      email: m.email,
      boardType: "CURRENT",
      displayOrder: m.displayOrder,
      isActive: true,
    })),
  );
}

// GET /board/members?boardType=CURRENT — any authenticated user; active only
router.get("/board/members", requireAuth, async (req, res): Promise<void> => {
  const raw = typeof req.query.boardType === "string" ? req.query.boardType : "CURRENT";
  const boardType: BoardType = isBoardType(raw) ? raw : "CURRENT";

  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(boardMembersTable)
      .where(
        and(
          eq(boardMembersTable.boardType, boardType),
          eq(boardMembersTable.isActive, true),
        ),
      )
      .orderBy(
        sql`${boardMembersTable.displayOrder} ASC`,
        sql`${boardMembersTable.createdAt} ASC`,
      );
    res.json(rows.map(formatMember));
  } catch (err) {
    req.log.error({ err }, "board members list failed");
    res.status(500).json({ error: "تعذر تحميل بيانات مجلس الإدارة" });
  }
});

// GET /board/members/:id — any authenticated user; active only
router.get("/board/members/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف العضو غير صالح" });
    return;
  }
  try {
    const [row] = await db
      .select()
      .from(boardMembersTable)
      .where(and(eq(boardMembersTable.id, id), eq(boardMembersTable.isActive, true)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "العضو غير موجود" });
      return;
    }
    res.json(formatMember(row));
  } catch (err) {
    req.log.error({ err }, "board member get failed");
    res.status(500).json({ error: "تعذر تحميل بيانات العضو" });
  }
});

// POST /board/members — ADMIN/SUPER_ADMIN only
router.post("/board/members", requireAuth, async (req, res): Promise<void> => {
  if (!isAdminOrSuper(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة مجلس الإدارة" });
    return;
  }

  const parsed = CreateBoardMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "البيانات المدخلة غير صالحة" });
    return;
  }

  const data = parsed.data;

  const name = data.name.trim();
  const position = data.position.trim();
  const bio = data.bio.trim();
  if (!name || !position || !bio) {
    res.status(400).json({ error: "الاسم والمنصب والنبذة حقول مطلوبة" });
    return;
  }
  const email = data.email?.trim() || null;
  if (email && !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "صيغة البريد الإلكتروني غير صالحة" });
    return;
  }
  const imageError = validateImageUrl(data.imageUrl);
  if (imageError) {
    res.status(400).json({ error: imageError });
    return;
  }

  const boardType: BoardType =
    data.boardType && isBoardType(data.boardType) ? data.boardType : "CURRENT";

  try {
    const [created] = await db
      .insert(boardMembersTable)
      .values({
        name,
        position,
        bio,
        phone: data.phone?.trim() || null,
        email,
        imageUrl: data.imageUrl?.trim() || null,
        boardType,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        createdById: req.user!.userId,
        updatedById: req.user!.userId,
      })
      .returning();
    res.status(201).json(formatMember(created));
  } catch (err) {
    req.log.error({ err }, "board member create failed");
    res.status(500).json({ error: "تعذر إضافة العضو" });
  }
});

// PATCH /board/members/:id — ADMIN/SUPER_ADMIN only
router.patch("/board/members/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isAdminOrSuper(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة مجلس الإدارة" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف العضو غير صالح" });
    return;
  }

  const parsed = UpdateBoardMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "البيانات المدخلة غير صالحة" });
    return;
  }
  const data = parsed.data;

  const updates: Partial<typeof boardMembersTable.$inferInsert> = {
    updatedById: req.user!.userId,
  };
  if (data.name !== undefined) {
    const v = data.name.trim();
    if (!v) {
      res.status(400).json({ error: "الاسم حقل مطلوب" });
      return;
    }
    updates.name = v;
  }
  if (data.position !== undefined) {
    const v = data.position.trim();
    if (!v) {
      res.status(400).json({ error: "المنصب حقل مطلوب" });
      return;
    }
    updates.position = v;
  }
  if (data.bio !== undefined) {
    const v = data.bio.trim();
    if (!v) {
      res.status(400).json({ error: "النبذة حقل مطلوب" });
      return;
    }
    updates.bio = v;
  }
  if (data.phone !== undefined) updates.phone = data.phone?.trim() || null;
  if (data.email !== undefined) {
    const v = data.email?.trim() || null;
    if (v && !EMAIL_RE.test(v)) {
      res.status(400).json({ error: "صيغة البريد الإلكتروني غير صالحة" });
      return;
    }
    updates.email = v;
  }
  if (data.imageUrl !== undefined) {
    const imageError = validateImageUrl(data.imageUrl);
    if (imageError) {
      res.status(400).json({ error: imageError });
      return;
    }
    updates.imageUrl = data.imageUrl?.trim() || null;
  }
  if (data.boardType !== undefined && isBoardType(data.boardType))
    updates.boardType = data.boardType;
  if (data.displayOrder !== undefined) updates.displayOrder = data.displayOrder;
  if (data.isActive !== undefined) updates.isActive = data.isActive;

  try {
    const [existing] = await db
      .select()
      .from(boardMembersTable)
      .where(eq(boardMembersTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "العضو غير موجود" });
      return;
    }
    const [updated] = await db
      .update(boardMembersTable)
      .set(updates)
      .where(eq(boardMembersTable.id, id))
      .returning();
    res.json(formatMember(updated));
  } catch (err) {
    req.log.error({ err }, "board member update failed");
    res.status(500).json({ error: "تعذر تحديث بيانات العضو" });
  }
});

// DELETE /board/members/:id — ADMIN/SUPER_ADMIN only; soft delete
router.delete("/board/members/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isAdminOrSuper(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة مجلس الإدارة" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف العضو غير صالح" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(boardMembersTable)
      .where(eq(boardMembersTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "العضو غير موجود" });
      return;
    }
    const [updated] = await db
      .update(boardMembersTable)
      .set({ isActive: false, updatedById: req.user!.userId })
      .where(eq(boardMembersTable.id, id))
      .returning();
    res.json(formatMember(updated));
  } catch (err) {
    req.log.error({ err }, "board member delete failed");
    res.status(500).json({ error: "تعذر إخفاء العضو" });
  }
});

export default router;
