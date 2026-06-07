import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, and, or, ne, ilike, sql } from "drizzle-orm";
import { UpdateAdminUserBody } from "@workspace/api-zod";
import { requireAuth } from "../../middlewares/auth";
import {
  isAdminOrSuper,
  canActOnUser,
  canChangeRole,
  type Role,
} from "../../lib/permissions";
import { parseSpecialties, serializeSpecialties } from "../../lib/academy";

const router = Router();

const VALID_ROLES = ["MEMBER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];
const VALID_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"];
type Status = "PENDING" | "ACTIVE" | "SUSPENDED";

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
    accessScope: row.accessScope ?? "FULL_APP",
    academySpecialty: row.academySpecialty ?? null,
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
    accessScope: row.accessScope ?? "FULL_APP",
    academySpecialty: row.academySpecialty ?? null,
    academyAllowedSpecialties: parseSpecialties(row.academyAllowedSpecialties),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const VALID_ACCESS_SCOPES = ["FULL_APP", "SYRIA_ACADEMY_ONLY"];

// A tx handle or the base db — both expose the same query builder.
type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Advisory-lock key shared by all SY-number issuance so concurrent activations
// serialize and never collide on SY{n}.
const SY_NUMBER_LOCK_KEY = 918273645;

// Generates the next SY membership number (SY1, SY2, …) by scanning existing
// SY-prefixed numbers and taking max+1. MUST be called inside a transaction
// that already holds the advisory lock so the read+increment is atomic.
async function generateNextSyNumber(tx: Executor): Promise<string> {
  const rows = await tx
    .select({ m: usersTable.membershipNumber })
    .from(usersTable)
    .where(ilike(usersTable.membershipNumber, "SY%"));
  let max = 0;
  for (const r of rows) {
    const match = /^SY(\d+)$/i.exec(r.m ?? "");
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `SY${max + 1}`;
}

async function countUsersWhere(where: ReturnType<typeof eq>): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(where);
  return row?.value ?? 0;
}

// Count super admins that can actually log in: only ACTIVE + isActive accounts
// count. PENDING/SUSPENDED/inactive supers cannot authenticate, so they must not
// satisfy the "last super admin" guards.
async function countLoginEligibleSupers(): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.role, "SUPER_ADMIN"),
        eq(usersTable.status, "ACTIVE"),
        eq(usersTable.isActive, true),
      )!,
    );
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
    const statusFilter = typeof req.query.status === "string" ? req.query.status : "";

    const conditions = [];
    if (roleFilter && VALID_ROLES.includes(roleFilter)) {
      conditions.push(eq(usersTable.role, roleFilter as Role));
    }
    if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
      conditions.push(eq(usersTable.status, statusFilter as Status));
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
    if (d.membershipNumber !== undefined) {
      const trimmed = d.membershipNumber?.trim() || null;
      if (trimmed) {
        const [conflict] = await db
          .select()
          .from(usersTable)
          .where(and(eq(usersTable.membershipNumber, trimmed), ne(usersTable.id, id)))
          .limit(1);
        if (conflict) {
          res.status(409).json({ error: "رقم العضوية مستخدم بالفعل" });
          return;
        }
      }
      updates.membershipNumber = trimmed;
    }

    if (d.accessScope !== undefined) {
      if (!VALID_ACCESS_SCOPES.includes(d.accessScope)) {
        res.status(400).json({ error: "نطاق الوصول غير صالح" });
        return;
      }
      updates.accessScope = d.accessScope;
    }
    if (d.academySpecialty !== undefined) {
      updates.academySpecialty = d.academySpecialty?.trim() || null;
    }
    if (d.academyAllowedSpecialties !== undefined) {
      updates.academyAllowedSpecialties = serializeSpecialties(d.academyAllowedSpecialties);
    }

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
        // Guard the last login-eligible super admin: demoting the only one that
        // can actually log in (ACTIVE + isActive) would lock everyone out even
        // if PENDING/SUSPENDED/inactive supers exist.
        const activeSupers = await countLoginEligibleSupers();
        const targetLoginEligible = target.status === "ACTIVE" && target.isActive;
        if (targetLoginEligible && activeSupers <= 1) {
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
      // A user is "deactivated" whenever the resulting state is not login-eligible:
      // isActive=false, or any status other than ACTIVE (SUSPENDED or PENDING).
      const deactivating =
        d.isActive === false || (d.status !== undefined && d.status !== "ACTIVE");
      if (target.id === actorId && deactivating) {
        res.status(403).json({ error: "لا يمكنك تعطيل حسابك الخاص" });
        return;
      }
      if (target.role === "SUPER_ADMIN" && deactivating) {
        const activeSupers = await countLoginEligibleSupers();
        const targetLoginEligible = target.status === "ACTIVE" && target.isActive;
        if (targetLoginEligible && activeSupers <= 1) {
          res.status(403).json({ error: "لا يمكن تعطيل آخر حساب سوبر أدمن نشط" });
          return;
        }
      }
      if (wantsStatus) updates.status = d.status!;
      if (wantsActive) updates.isActive = d.isActive!;
    }

    // Decide whether activating this user requires auto-issuing an SY number.
    const finalAccessScope = updates.accessScope ?? target.accessScope ?? "FULL_APP";
    const finalStatus = updates.status ?? target.status;
    const finalIsActive = updates.isActive ?? target.isActive;
    const becomingActive = finalStatus === "ACTIVE" && finalIsActive === true;
    const currentMembership = updates.membershipNumber ?? target.membershipNumber;
    const hasNumericMembership = !!currentMembership && /^\d+$/.test(currentMembership);
    const needsSyNumber =
      finalAccessScope === "SYRIA_ACADEMY_ONLY" &&
      becomingActive &&
      !currentMembership &&
      !hasNumericMembership;

    if (Object.keys(updates).length === 0 && !needsSyNumber) {
      res.status(400).json({ error: "لا توجد بيانات للتعديل" });
      return;
    }

    // Run the SY-number generation and the update in ONE transaction guarded by
    // a transaction-scoped advisory lock, so concurrent activations serialize
    // and the SY{n} read+increment can never produce a duplicate.
    const updated = await db.transaction(async (tx) => {
      if (needsSyNumber) {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${SY_NUMBER_LOCK_KEY})`);
        updates.membershipNumber = await generateNextSyNumber(tx);
      }
      const [row] = await tx
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, id))
        .returning();
      return row;
    });

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
