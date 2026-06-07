import { Router } from "express";
import {
  db,
  tasksTable,
  taskAssigneesTable,
  usersTable,
} from "@workspace/db";
import { eq, and, inArray, desc } from "drizzle-orm";
import { CreateAdminTaskBody, UpdateAdminTaskBody } from "@workspace/api-zod";
import { requireAuth } from "../../middlewares/auth";
import { isStaff } from "../../lib/permissions";
import {
  fetchActiveAssignees,
  fetchReports,
  formatTaskItem,
  formatTaskDetail,
  type AssigneeInfo,
} from "../../lib/taskFormat";

const router = Router();

const VALID_STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_REVIEW",
  "COMPLETED",
  "POSTPONED",
  "CANCELLED",
];

// Validates that all given user ids are ACTIVE MEMBER accounts; returns the found ids.
async function activeUserIds(ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(
      and(
        inArray(usersTable.id, ids),
        eq(usersTable.role, "MEMBER"),
        eq(usersTable.status, "ACTIVE"),
        eq(usersTable.isActive, true),
      ),
    );
  return new Set(rows.map((r) => r.id));
}

// Replaces the active assignee set of a task with the provided user ids.
async function reconcileAssignees(taskId: number, userIds: number[], actorId: number) {
  const existing = await db
    .select()
    .from(taskAssigneesTable)
    .where(eq(taskAssigneesTable.taskId, taskId));
  const existingByUser = new Map(existing.map((e) => [e.userId, e]));
  const wanted = new Set(userIds);

  // Deactivate everyone no longer wanted.
  for (const e of existing) {
    if (!wanted.has(e.userId) && e.isActive) {
      await db
        .update(taskAssigneesTable)
        .set({ isActive: false })
        .where(eq(taskAssigneesTable.id, e.id));
    }
  }
  // Activate / insert the wanted set.
  for (const uid of wanted) {
    const ex = existingByUser.get(uid);
    if (ex) {
      await db
        .update(taskAssigneesTable)
        .set({ isActive: true, assignedById: actorId })
        .where(eq(taskAssigneesTable.id, ex.id));
    } else {
      await db
        .insert(taskAssigneesTable)
        .values({ taskId, userId: uid, assignedById: actorId });
    }
  }
}

async function loadDetail(id: number, res: import("express").Response): Promise<void> {
  const [row] = await db
    .select({ task: tasksTable, createdByName: usersTable.fullName })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.createdById, usersTable.id))
    .where(eq(tasksTable.id, id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "المهمة غير موجودة" });
    return;
  }
  const assignees = await fetchActiveAssignees([id]);
  const reports = await fetchReports([id]);
  res.json(formatTaskDetail(row.task, row.createdByName, assignees.get(id) ?? [], reports.get(id) ?? []));
}

// GET /admin/tasks?status=&priority= — staff only
router.get("/admin/tasks", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لعرض المهام" });
    return;
  }
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const priority = typeof req.query.priority === "string" ? req.query.priority : "";

    const conditions = [];
    if (status && VALID_STATUSES.includes(status)) {
      conditions.push(eq(tasksTable.status, status));
    }
    if (priority && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) {
      conditions.push(eq(tasksTable.priority, priority));
    }

    const base = db
      .select({ task: tasksTable, createdByName: usersTable.fullName })
      .from(tasksTable)
      .leftJoin(usersTable, eq(tasksTable.createdById, usersTable.id));

    const rows =
      conditions.length > 0
        ? await base.where(and(...conditions)).orderBy(desc(tasksTable.createdAt)).limit(500)
        : await base.orderBy(desc(tasksTable.createdAt)).limit(500);

    const ids = rows.map((r) => r.task.id);
    const assignees = await fetchActiveAssignees(ids);
    const reports = await fetchReports(ids);

    res.json(
      rows.map((r) =>
        formatTaskItem(
          r.task,
          r.createdByName,
          assignees.get(r.task.id) ?? [],
          reports.get(r.task.id) ?? [],
        ),
      ),
    );
  } catch (err) {
    req.log.error({ err }, "admin tasks list failed");
    res.status(500).json({ error: "تعذر تحميل المهام" });
  }
});

// GET /admin/tasks/export — staff only (registered before :id)
router.get("/admin/tasks/export", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لتصدير المهام" });
    return;
  }
  try {
    const rows = await db
      .select({ task: tasksTable, createdByName: usersTable.fullName })
      .from(tasksTable)
      .leftJoin(usersTable, eq(tasksTable.createdById, usersTable.id))
      .orderBy(desc(tasksTable.createdAt))
      .limit(2000);

    const ids = rows.map((r) => r.task.id);
    const assignees = await fetchActiveAssignees(ids);
    const reports = await fetchReports(ids);

    const assigneeLabel = (list: AssigneeInfo[]) =>
      list
        .map((a) => a.fullName ?? a.account ?? String(a.row.userId))
        .filter(Boolean)
        .join(", ");

    res.json(
      rows.map((r) => {
        const repList = reports.get(r.task.id) ?? [];
        const latest = repList[0];
        return {
          id: r.task.id,
          title: r.task.title,
          description: r.task.description,
          priority: r.task.priority,
          status: r.task.status,
          assignees: assigneeLabel(assignees.get(r.task.id) ?? []),
          startDate: r.task.startDate ?? null,
          dueDate: r.task.dueDate ?? null,
          createdByName: r.createdByName ?? null,
          createdAt: r.task.createdAt?.toISOString() ?? null,
          latestReportText: latest ? latest.row.reportText : null,
          latestProgress: latest?.row.progressPercent ?? null,
          adminNotes: r.task.adminNotes ?? null,
        };
      }),
    );
  } catch (err) {
    req.log.error({ err }, "admin tasks export failed");
    res.status(500).json({ error: "تعذر تصدير المهام" });
  }
});

// GET /admin/tasks/assignable-users — staff only (registered before :id)
router.get("/admin/tasks/assignable-users", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لعرض الأعضاء" });
    return;
  }
  try {
    const rows = await db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        account: usersTable.account,
        email: usersTable.email,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.role, "MEMBER"),
          eq(usersTable.status, "ACTIVE"),
          eq(usersTable.isActive, true),
        ),
      )
      .orderBy(usersTable.fullName)
      .limit(1000);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "assignable users failed");
    res.status(500).json({ error: "تعذر تحميل الأعضاء" });
  }
});

// POST /admin/tasks — staff only; create + assign
router.post("/admin/tasks", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإنشاء المهام" });
    return;
  }
  const parsed = CreateAdminTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "البيانات المدخلة غير صالحة" });
    return;
  }
  const data = parsed.data;
  const title = data.title.trim();
  const description = data.description.trim();
  if (!title || !description) {
    res.status(400).json({ error: "يرجى إدخال عنوان ووصف المهمة" });
    return;
  }

  const assigneeIds = [...new Set(data.assigneeIds)];
  if (assigneeIds.length === 0) {
    res.status(400).json({ error: "يرجى اختيار عضو واحد على الأقل" });
    return;
  }
  const active = await activeUserIds(assigneeIds);
  if (active.size !== assigneeIds.length) {
    res.status(400).json({ error: "بعض الأعضاء المحددين غير موجودين أو غير مفعّلين" });
    return;
  }

  try {
    const [task] = await db
      .insert(tasksTable)
      .values({
        title,
        description,
        priority: data.priority,
        status: data.status ?? "NEW",
        startDate: data.startDate?.trim() || null,
        dueDate: data.dueDate?.trim() || null,
        adminNotes: data.adminNotes?.trim() || null,
        createdById: req.user!.userId,
      })
      .returning();

    await db.insert(taskAssigneesTable).values(
      assigneeIds.map((uid) => ({
        taskId: task.id,
        userId: uid,
        assignedById: req.user!.userId,
      })),
    );

    await loadDetail(task.id, res);
  } catch (err) {
    req.log.error({ err }, "admin task create failed");
    res.status(500).json({ error: "تعذر إنشاء المهمة" });
  }
});

// PATCH /admin/tasks/:id — staff only; update fields / reassign / status / notes
router.patch("/admin/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لتعديل المهام" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المهمة غير صالح" });
    return;
  }

  const parsed = UpdateAdminTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "البيانات المدخلة غير صالحة" });
    return;
  }
  const data = parsed.data;

  try {
    const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "المهمة غير موجودة" });
      return;
    }

    const updates: Partial<typeof tasksTable.$inferInsert> = {};
    if (data.title !== undefined) {
      const t = data.title.trim();
      if (!t) {
        res.status(400).json({ error: "عنوان المهمة غير صالح" });
        return;
      }
      updates.title = t;
    }
    if (data.description !== undefined) {
      const d = data.description.trim();
      if (!d) {
        res.status(400).json({ error: "وصف المهمة غير صالح" });
        return;
      }
      updates.description = d;
    }
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.status !== undefined) updates.status = data.status;
    if (data.startDate !== undefined) updates.startDate = data.startDate?.trim() || null;
    if (data.dueDate !== undefined) updates.dueDate = data.dueDate?.trim() || null;
    if (data.adminNotes !== undefined) updates.adminNotes = data.adminNotes?.trim() || null;

    // Validate + reconcile assignees if provided.
    if (data.assigneeIds !== undefined) {
      const ids = [...new Set(data.assigneeIds)];
      if (ids.length === 0) {
        res.status(400).json({ error: "يرجى اختيار عضو واحد على الأقل" });
        return;
      }
      const active = await activeUserIds(ids);
      if (active.size !== ids.length) {
        res.status(400).json({ error: "بعض الأعضاء المحددين غير موجودين أو غير مفعّلين" });
        return;
      }
      await reconcileAssignees(id, ids, req.user!.userId);
    }

    if (Object.keys(updates).length > 0) {
      await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id));
    }

    await loadDetail(id, res);
  } catch (err) {
    req.log.error({ err }, "admin task update failed");
    res.status(500).json({ error: "تعذر تحديث المهمة" });
  }
});

export default router;
