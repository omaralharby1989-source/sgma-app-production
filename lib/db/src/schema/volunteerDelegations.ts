import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const volunteerDelegationRequestsTable = pgTable("volunteer_delegation_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fullNameArabic: text("full_name_arabic").notNull(),
  fullNameGerman: text("full_name_german").notNull(),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp").notNull(),
  email: text("email").notNull(),
  travelToSyriaFrom: text("travel_to_syria_from").notNull(),
  travelToSyriaTo: text("travel_to_syria_to").notNull(),
  volunteerWorkDateText: text("volunteer_work_date_text").notNull(),
  volunteerWorkType: text("volunteer_work_type").notNull(),
  professionGroup: text("profession_group").notNull(),
  specialtyWithCertificate: text("specialty_with_certificate").notNull(),
  needsSyrianPracticeLicenseHelp: boolean("needs_syrian_practice_license_help").notNull(),
  hasLogisticsEquipment: boolean("has_logistics_equipment").notNull(),
  equipmentDetails: text("equipment_details"),
  status: text("status").notNull().default("SUBMITTED"),
  adminNotes: text("admin_notes"),
  reviewedById: integer("reviewed_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const volunteerDelegationFilesTable = pgTable("volunteer_delegation_files", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileData: text("file_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VolunteerDelegationRequest = typeof volunteerDelegationRequestsTable.$inferSelect;
export type VolunteerDelegationFile = typeof volunteerDelegationFilesTable.$inferSelect;
