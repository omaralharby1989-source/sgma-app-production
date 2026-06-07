import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const academyLecturesTable = pgTable("academy_lectures", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  lecturerName: text("lecturer_name").notNull(),
  lectureDate: text("lecture_date"),
  lectureTime: text("lecture_time"),
  isUpcoming: boolean("is_upcoming").notNull().default(false),
  liveMeetingUrl: text("live_meeting_url"),
  recordingDriveUrl: text("recording_drive_url"),
  recordingEmbedUrl: text("recording_embed_url"),
  thumbnailUrl: text("thumbnail_url"),
  allowedSpecialties: text("allowed_specialties"),
  isGeneral: boolean("is_general").notNull().default(false),
  status: text("status").notNull().default("DRAFT"),
  createdById: integer("created_by_id").notNull(),
  updatedById: integer("updated_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const academyFilesTable = pgTable("academy_files", {
  id: serial("id").primaryKey(),
  lectureId: integer("lecture_id").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileData: text("file_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AcademyLecture = typeof academyLecturesTable.$inferSelect;
export type AcademyFile = typeof academyFilesTable.$inferSelect;
