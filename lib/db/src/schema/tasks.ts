import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("MEDIUM"),
  status: text("status").notNull().default("NEW"),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  createdById: integer("created_by_id").notNull(),
  updatedById: integer("updated_by_id"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const taskAssigneesTable = pgTable("task_assignees", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  userId: integer("user_id").notNull(),
  assignedById: integer("assigned_by_id").notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const taskReportsTable = pgTable("task_reports", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  authorId: integer("author_id").notNull(),
  reportText: text("report_text").notNull(),
  progressPercent: integer("progress_percent"),
  reportType: text("report_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const taskReportAttachmentsTable = pgTable("task_report_attachments", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileData: text("file_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Task = typeof tasksTable.$inferSelect;
export type TaskAssigneeRow = typeof taskAssigneesTable.$inferSelect;
export type TaskReportRow = typeof taskReportsTable.$inferSelect;
export type TaskReportAttachmentRow = typeof taskReportAttachmentsTable.$inferSelect;
