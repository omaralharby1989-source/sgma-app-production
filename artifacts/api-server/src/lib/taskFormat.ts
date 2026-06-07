import {
  db,
  tasksTable,
  taskAssigneesTable,
  taskReportsTable,
  taskReportAttachmentsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, inArray, desc } from "drizzle-orm";

type TaskRow = typeof tasksTable.$inferSelect;
type AssigneeRow = typeof taskAssigneesTable.$inferSelect;
type ReportRow = typeof taskReportsTable.$inferSelect;
type AttachmentRow = typeof taskReportAttachmentsTable.$inferSelect;

export interface AssigneeInfo {
  row: AssigneeRow;
  fullName: string | null;
  account: string | null;
  email: string | null;
}

export interface ReportInfo {
  row: ReportRow;
  authorName: string | null;
  attachments: AttachmentRow[];
}

// Fetches the ACTIVE assignees (with user info) for a set of task ids.
export async function fetchActiveAssignees(taskIds: number[]): Promise<Map<number, AssigneeInfo[]>> {
  const map = new Map<number, AssigneeInfo[]>();
  if (taskIds.length === 0) return map;
  const rows = await db
    .select({
      a: taskAssigneesTable,
      fullName: usersTable.fullName,
      account: usersTable.account,
      email: usersTable.email,
    })
    .from(taskAssigneesTable)
    .leftJoin(usersTable, eq(taskAssigneesTable.userId, usersTable.id))
    .where(and(inArray(taskAssigneesTable.taskId, taskIds), eq(taskAssigneesTable.isActive, true)));
  for (const r of rows) {
    const list = map.get(r.a.taskId) ?? [];
    list.push({ row: r.a, fullName: r.fullName, account: r.account, email: r.email });
    map.set(r.a.taskId, list);
  }
  return map;
}

// Fetches reports (newest first) with their attachments and author names for a set of task ids.
export async function fetchReports(taskIds: number[]): Promise<Map<number, ReportInfo[]>> {
  const map = new Map<number, ReportInfo[]>();
  if (taskIds.length === 0) return map;
  const reports = await db
    .select({ r: taskReportsTable, authorName: usersTable.fullName })
    .from(taskReportsTable)
    .leftJoin(usersTable, eq(taskReportsTable.authorId, usersTable.id))
    .where(inArray(taskReportsTable.taskId, taskIds))
    .orderBy(desc(taskReportsTable.createdAt));

  const reportIds = reports.map((r) => r.r.id);
  const attByReport = new Map<number, AttachmentRow[]>();
  if (reportIds.length > 0) {
    const atts = await db
      .select()
      .from(taskReportAttachmentsTable)
      .where(inArray(taskReportAttachmentsTable.reportId, reportIds));
    for (const a of atts) {
      const l = attByReport.get(a.reportId) ?? [];
      l.push(a);
      attByReport.set(a.reportId, l);
    }
  }

  for (const r of reports) {
    const list = map.get(r.r.taskId) ?? [];
    list.push({ row: r.r, authorName: r.authorName, attachments: attByReport.get(r.r.id) ?? [] });
    map.set(r.r.taskId, list);
  }
  return map;
}

function formatAssignee(info: AssigneeInfo) {
  return {
    id: info.row.id,
    taskId: info.row.taskId,
    userId: info.row.userId,
    userFullName: info.fullName ?? null,
    userAccount: info.account ?? null,
    userEmail: info.email ?? null,
    isActive: info.row.isActive,
    assignedAt: info.row.assignedAt?.toISOString() ?? null,
  };
}

function formatAttachmentMeta(a: AttachmentRow) {
  return {
    id: a.id,
    reportId: a.reportId,
    fileName: a.fileName,
    mimeType: a.mimeType,
    fileSize: a.fileSize,
    createdAt: a.createdAt?.toISOString() ?? null,
  };
}

function formatReport(info: ReportInfo) {
  return {
    id: info.row.id,
    taskId: info.row.taskId,
    authorId: info.row.authorId,
    authorName: info.authorName ?? null,
    reportText: info.row.reportText,
    progressPercent: info.row.progressPercent ?? null,
    reportType: info.row.reportType,
    createdAt: info.row.createdAt?.toISOString() ?? null,
    updatedAt: info.row.updatedAt?.toISOString() ?? null,
    attachments: info.attachments.map(formatAttachmentMeta),
  };
}

export function formatTaskItem(
  task: TaskRow,
  createdByName: string | null,
  assignees: AssigneeInfo[],
  reports: ReportInfo[],
) {
  const latest = reports[0];
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    startDate: task.startDate ?? null,
    dueDate: task.dueDate ?? null,
    createdById: task.createdById,
    createdByName: createdByName ?? null,
    adminNotes: task.adminNotes ?? null,
    createdAt: task.createdAt?.toISOString() ?? null,
    updatedAt: task.updatedAt?.toISOString() ?? null,
    latestReportAt: latest?.row.createdAt?.toISOString() ?? null,
    latestReportExcerpt: latest ? latest.row.reportText.slice(0, 160) : null,
    latestProgress: latest?.row.progressPercent ?? null,
    assignees: assignees.map(formatAssignee),
  };
}

export function formatTaskDetail(
  task: TaskRow,
  createdByName: string | null,
  assignees: AssigneeInfo[],
  reports: ReportInfo[],
) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    startDate: task.startDate ?? null,
    dueDate: task.dueDate ?? null,
    createdById: task.createdById,
    createdByName: createdByName ?? null,
    adminNotes: task.adminNotes ?? null,
    createdAt: task.createdAt?.toISOString() ?? null,
    updatedAt: task.updatedAt?.toISOString() ?? null,
    assignees: assignees.map(formatAssignee),
    reports: reports.map(formatReport),
  };
}
