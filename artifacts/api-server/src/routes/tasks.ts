import { Router } from "express";
import {
  db,
  tasksTable,
  taskAssigneesTable,
  taskReportsTable,
  taskReportAttachmentsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, inArray, desc } from "drizzle-orm";
import { CreateTaskReportBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { isStaff } from "../lib/permissions";
import {
  validateTaskAttachment,
  MAX_TASK_ATTACHMENT_FILES,
  type ParsedTaskAttachment,
} from "../lib/taskAttachmentValidation";
import {
  fetchActiveAssignees,
  fetchReports,
  formatTaskItem,
  formatTaskDetail,
} from "../lib/taskFormat";

const router = Router();

// Returns true if the given user is an ACTIVE assignee of the task.
async function isAssignedTo(taskId: number, userId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: taskAssigneesTable.id })
    .from(taskAssigneesTable)
    .where(
      and(
        eq(taskAssigneesTable.taskId, taskId),
        eq(taskAssigneesTable.userId, userId),
        eq(taskAssigneesTable.isActive, true),
      ),
    )
    .limit(1);
  return !!row;
}

// GET /tasks/my — tasks assigned to the current user
router.get("/tasks/my", requireAuth, async (req, res): Promise<void> => {
  try {
    const assigned = await db
      .select({ taskId: taskAssigneesTable.taskId })
      .from(taskAssigneesTable)
      .where(
        and(
          eq(taskAssigneesTable.userId, req.user!.userId),
          eq(taskAssigneesTable.isActive, true),
        ),
      );
    const taskIds = [...new Set(assigned.map((a) => a.taskId))];
    if (taskIds.length === 0) {
      res.json([]);
      return;
    }

    const rows = await db
      .select({ task: tasksTable, createdByName: usersTable.fullName })
      .from(tasksTable)
      .leftJoin(usersTable, eq(tasksTable.createdById, usersTable.id))
      .where(inArray(tasksTable.id, taskIds))
      .orderBy(desc(tasksTable.createdAt));

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
    req.log.error({ err }, "my tasks list failed");
    res.status(500).json({ error: "تعذر تحميل المهام" });
  }
});

// GET /tasks/reports/attachments/:attachmentId — assigned member or staff (registered before /tasks/:id)
router.get(
  "/tasks/reports/attachments/:attachmentId",
  requireAuth,
  async (req, res): Promise<void> => {
    const attachmentId = Number(req.params.attachmentId);
    if (!Number.isInteger(attachmentId)) {
      res.status(400).json({ error: "معرّف الملف غير صالح" });
      return;
    }
    try {
      const [row] = await db
        .select({
          att: taskReportAttachmentsTable,
          authorId: taskReportsTable.authorId,
        })
        .from(taskReportAttachmentsTable)
        .innerJoin(
          taskReportsTable,
          eq(taskReportAttachmentsTable.reportId, taskReportsTable.id),
        )
        .where(eq(taskReportAttachmentsTable.id, attachmentId))
        .limit(1);

      if (!row) {
        res.status(404).json({ error: "الملف غير موجود" });
        return;
      }
      // Staff may download any attachment; members may download ONLY their own.
      if (!isStaff(req.user!.role) && row.authorId !== req.user!.userId) {
        res.status(403).json({ error: "ليس لديك صلاحية للوصول إلى هذا الملف" });
        return;
      }
      res.json({
        id: row.att.id,
        fileName: row.att.fileName,
        mimeType: row.att.mimeType,
        fileSize: row.att.fileSize,
        fileData: row.att.fileData,
      });
    } catch (err) {
      req.log.error({ err }, "task attachment download failed");
      res.status(500).json({ error: "تعذر تحميل الملف" });
    }
  },
);

// GET /tasks/:id — assigned member or staff
router.get("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المهمة غير صالح" });
    return;
  }
  try {
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
    if (!isStaff(req.user!.role) && !(await isAssignedTo(id, req.user!.userId))) {
      res.status(403).json({ error: "ليس لديك صلاحية لعرض هذه المهمة" });
      return;
    }
    const assignees = await fetchActiveAssignees([id]);
    const reports = await fetchReports([id]);
    res.json(formatTaskDetail(row.task, row.createdByName, assignees.get(id) ?? [], reports.get(id) ?? []));
  } catch (err) {
    req.log.error({ err }, "get task failed");
    res.status(500).json({ error: "تعذر تحميل المهمة" });
  }
});

// POST /tasks/:id/reports — member submits a report; staff adds an admin note
router.post("/tasks/:id/reports", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المهمة غير صالح" });
    return;
  }

  const parsed = CreateTaskReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "البيانات المدخلة غير صالحة" });
    return;
  }
  const data = parsed.data;
  const reportText = data.reportText.trim();
  if (!reportText) {
    res.status(400).json({ error: "يرجى إدخال نص التقرير" });
    return;
  }

  try {
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id)).limit(1);
    if (!task) {
      res.status(404).json({ error: "المهمة غير موجودة" });
      return;
    }

    const staff = isStaff(req.user!.role);
    if (!staff && !(await isAssignedTo(id, req.user!.userId))) {
      res.status(403).json({ error: "ليس لديك صلاحية لإضافة تقرير لهذه المهمة" });
      return;
    }

    // Report type is forced by actor role: staff always ADMIN_NOTE, members
    // always MEMBER_REPORT. Client-supplied reportType is never trusted, so
    // staff cannot spoof a member report to trigger the auto status transition.
    const reportType = staff ? "ADMIN_NOTE" : "MEMBER_REPORT";

    let progressPercent: number | null = null;
    if (data.progressPercent !== undefined && data.progressPercent !== null) {
      const p = Math.round(Number(data.progressPercent));
      if (Number.isFinite(p)) progressPercent = Math.max(0, Math.min(100, p));
    }

    const rawAtts = Array.isArray(data.attachments) ? data.attachments : [];
    if (rawAtts.length > MAX_TASK_ATTACHMENT_FILES) {
      res.status(400).json({ error: "لا يمكن رفع أكثر من 5 ملفات" });
      return;
    }
    const files: ParsedTaskAttachment[] = [];
    for (const att of rawAtts) {
      const result = validateTaskAttachment(att);
      if ("error" in result) {
        res.status(400).json({ error: result.error });
        return;
      }
      files.push(result.file);
    }

    const [report] = await db
      .insert(taskReportsTable)
      .values({
        taskId: id,
        authorId: req.user!.userId,
        reportText,
        progressPercent,
        reportType,
      })
      .returning();

    if (files.length > 0) {
      await db.insert(taskReportAttachmentsTable).values(
        files.map((f) => ({
          reportId: report.id,
          fileName: f.fileName,
          mimeType: f.mimeType,
          fileSize: f.fileSize,
          fileData: f.fileData,
        })),
      );
    }

    // Member report auto-advances NEW/IN_PROGRESS tasks to WAITING_REVIEW.
    if (
      reportType === "MEMBER_REPORT" &&
      (task.status === "NEW" || task.status === "IN_PROGRESS")
    ) {
      await db.update(tasksTable).set({ status: "WAITING_REVIEW" }).where(eq(tasksTable.id, id));
    }

    const [row] = await db
      .select({ task: tasksTable, createdByName: usersTable.fullName })
      .from(tasksTable)
      .leftJoin(usersTable, eq(tasksTable.createdById, usersTable.id))
      .where(eq(tasksTable.id, id))
      .limit(1);
    const assignees = await fetchActiveAssignees([id]);
    const reports = await fetchReports([id]);
    res
      .status(201)
      .json(formatTaskDetail(row!.task, row!.createdByName, assignees.get(id) ?? [], reports.get(id) ?? []));
  } catch (err) {
    req.log.error({ err }, "create task report failed");
    res.status(500).json({ error: "تعذر إضافة التقرير" });
  }
});

export default router;
