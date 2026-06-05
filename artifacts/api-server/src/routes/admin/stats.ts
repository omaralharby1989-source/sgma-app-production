import { Router } from "express";
import { db, articlesTable, newsTable, usersTable } from "@workspace/db";
import { eq, sql, type SQL } from "drizzle-orm";
import { requireAuth } from "../../middlewares/auth";
import { isStaff, isAdminOrSuper, isSuperAdmin } from "../../lib/permissions";

const router = Router();

async function countUsers(where?: SQL): Promise<number> {
  const base = db.select({ value: sql<number>`count(*)::int` }).from(usersTable);
  const [row] = where ? await base.where(where) : await base;
  return row?.value ?? 0;
}

// Dashboard statistics (staff only; user/role counts gated to admin/super)
router.get("/admin/stats", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية للوصول إلى لوحة الإدارة" });
    return;
  }

  try {
    const [pa] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(articlesTable)
      .where(eq(articlesTable.status, "PENDING"));
    const [pn] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(newsTable)
      .where(eq(newsTable.status, "PUBLISHED"));

    const stats: {
      pendingArticles: number;
      publishedNews: number;
      totalUsers: number | null;
      activeUsers: number | null;
      moderatorCount: number | null;
      adminCount: number | null;
      superAdminCount: number | null;
    } = {
      pendingArticles: pa?.value ?? 0,
      publishedNews: pn?.value ?? 0,
      totalUsers: null,
      activeUsers: null,
      moderatorCount: null,
      adminCount: null,
      superAdminCount: null,
    };

    if (isAdminOrSuper(req.user!.role)) {
      stats.totalUsers = await countUsers();
      stats.activeUsers = await countUsers(eq(usersTable.isActive, true));
    }

    if (isSuperAdmin(req.user!.role)) {
      stats.moderatorCount = await countUsers(eq(usersTable.role, "MODERATOR"));
      stats.adminCount = await countUsers(eq(usersTable.role, "ADMIN"));
      stats.superAdminCount = await countUsers(eq(usersTable.role, "SUPER_ADMIN"));
    }

    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "Admin stats error");
    res.status(500).json({ error: "تعذر تحميل الإحصائيات" });
  }
});

export default router;
