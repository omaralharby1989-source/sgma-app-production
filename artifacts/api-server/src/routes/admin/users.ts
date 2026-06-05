import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { UpdateAdminUserBody } from "@workspace/api-zod";
import { requireAuth } from "../../middlewares/auth";
import {
  isAdminOrSuper,
  canActOnUser,
  canChangeRole,
  type Role,
} from "../../lib/permissions";

const router = Router();

const VALID_ROLES = ["MEMBER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

type UserRow = typeof usersTable.$inferSelect;

function formatUserItem(row: UserRow) {
  return {
    id: row.id,
    fullName: row.fullName,
    account: row.account,
    email: row.email,
    role: row.role,
    status: row.status,
    isActive: row.isActive,
    professionGroup: row.professionGroup,
    membershipNumber: row.membershipNumber ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function formatUserDetail(row: UserRow) {
  return {
    id: row.id,
    fullName: row.fullName,
    account: row.account,
    email: row.email,
    role: row.role,
    status: row.status,
    isActive: row.isActive,
    isDeveloper: row.isDeveloper,
    phone: row.phone,
    whatsapp: row.whatsapp,
    birthDate: row.birthDate,
    address: row.address,
    professionGroup: row.professionGroup,
    specialtyText: row.specialtyText,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    membershipNumber: row.membershipNumber ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function countUsersWhere(where: ReturnType<typeof eq>): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(where);
  return row?.value ?? 0;
}

// List users (admin/super only)
router.get("/admin/users", requireAuth, async (req, res): Promise<void> => {
  if (!isAdminOrSuper(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة الأعضاء" });
    return;
  }

  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const roleFilter = typeof req.query.role === "string" ? req.query.role : "";

    const conditions = [];
    if (roleFilter && VALID_ROLES.includes(roleFilter)) {
      conditions.push(eq(usersTable.role, roleFilter as Role));
    }
    if (q) {
      const like = `%${q}%`;
      conditions.push(
        or(
          ilike(usersTable.fullName, like),
          ilike(usersTable.account, like),
          ilike(usersTable.email, like),
        )!,
      );
    }

    const base = db.select().from(usersTable);
    const rows = conditions.length
      ? await base
          .where(and(...conditions))
          .orderBy(sql`${usersTable.createdAt} DESC`, sql`${usersTable.id} DESC`)
          .limit(500)
      : await base
          .orderBy(sql`${usersTable.createdAt} DESC`, sql`${usersTable.id} DESC`)
          .limit(500);

    res.json(rows.map(formatUserItem));
  } catch (err) {
    req.log.error({ err }, "Admin list users error");
    res.status(500).json({ error: "تعذر تحميل الأعضاء" });
  }
});

// Get one user (admin/super only)
router.get("/admin/users/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isAdminOrSuper(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة الأعضاء" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المستخدم غير صالح" });
    return;
  }

  try {
    const [row] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!row) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    res.json(formatUserDetail(row));
  } catch (err) {
    req.log.error({ err }, "Admin get user error");
    res.status(500).json({ error: "تعذر تحميل بيانات المستخدم" });
  }
});

// Update a user's profile/role/status (admin/super only, permission-checked)
router.patch("/admin/users/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isAdminOrSuper(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة الأعضاء" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المستخدم غير صالح" });
    return;
  }

  const parsed = UpdateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات المستخدم غير صحيحة" });
    return;
  }

  const actorRole = req.user!.role;
  const actorId = req.user!.userId;

  try {
    const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!target) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }

    if (!canActOnUser(actorRole, target.role)) {
      res.status(403).json({ error: "ليس لديك صلاحية لإدارة هذا المستخدم" });
      return;
    }

    const d = parsed.data;
    const updates: Partial<typeof usersTable.$inferInsert> = {};

    if (d.fullName !== undefined) updates.fullName = d.fullName.trim();
    if (d.account !== undefined) updates.account = d.account.trim();
    if (d.email !== undefined) updates.email = d.email.trim();
    if (d.phone !== undefined) updates.phone = d.phone?.trim() || null;
    if (d.whatsapp !== undefined) updates.whatsapp = d.whatsapp?.trim() || null;
    if (d.address !== undefined) updates.address = d.address?.trim() || null;
    if (d.birthDate !== undefined) updates.birthDate = d.birthDate?.trim() || null;
    if (d.professionGroup !== undefined) updates.professionGroup = d.professionGroup?.trim() || null;
    if (d.specialtyText !== undefined) updates.specialtyText = d.specialtyText?.trim() || null;
    if (d.bio !== undefined) updates.bio = d.bio?.trim() || null;
    if (d.membershipNumber !== undefined)
      updates.membershipNumber = d.membershipNumber?.trim() || null;

    // Role change
    if (d.role !== undefined && d.role !== target.role) {
      if (target.id === actorId) {
        res.status(403).json({ error: "لا يمكنك تغيير صلاحيتك الخاصة" });
        return;
      }
      if (!canChangeRole(actorRole, target.role, d.role)) {
        res.status(403).json({ error: "ليس لديك صلاحية لتعيين هذه الصلاحية" });
        return;
      }
      if (target.role === "SUPER_ADMIN" && d.role !== "SUPER_ADMIN") {
        // Guard the last ACTIVE super admin: demoting the only active super
        // would lock everyone out even if inactive/suspended supers exist.
        const activeSupers = await countUsersWhere(
          and(eq(usersTable.role, "SUPER_ADMIN"), eq(usersTable.isActive, true))!,
        );
        if (target.isActive && activeSupers <= 1) {
          res.status(403).json({ error: "لا يمكن إزالة آخر حساب سوبر أدمن نشط" });
          return;
        }
      }
      updates.role = d.role;
    }

    // Status / isActive change
    const wantsStatus = d.status !== undefined && d.status !== target.status;
    const wantsActive = d.isActive !== undefined && d.isActive !== target.isActive;
    if (wantsStatus || wantsActive) {
      const deactivating = d.isActive === false || d.status === "SUSPENDED";
      if (target.id === actorId && deactivating) {
        res.status(403).json({ error: "لا يمكنك تعطيل حسابك الخاص" });
        return;
      }
      if (target.role === "SUPER_ADMIN" && deactivating) {
        const activeSupers = await countUsersWhere(
          and(eq(usersTable.role, "SUPER_ADMIN"), eq(usersTable.isActive, true))!,
        );
        if (activeSupers <= 1) {
          res.status(403).json({ error: "لا يمكن تعطيل آخر حساب سوبر أدمن نشط" });
          return;
        }
      }
      if (wantsStatus) updates.status = d.status!;
      if (wantsActive) updates.isActive = d.isActive!;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "لا توجد بيانات للتعديل" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, id))
      .returning();

    res.json(formatUserDetail(updated));
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") {
      res.status(400).json({ error: "البريد الإلكتروني أو اسم الحساب مستخدم بالفعل" });
      return;
    }
    req.log.error({ err }, "Admin update user error");
    res.status(500).json({ error: "تعذر تحديث المستخدم" });
  }
});

export default router;
