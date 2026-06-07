import { Router } from "express";
import { db, academyLecturesTable, academyFilesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateAdminAcademyLectureBody,
  UpdateAdminAcademyLectureBody,
} from "@workspace/api-zod";
import { requireAuth, requireFullApp } from "../../middlewares/auth";
import { isStaff } from "../../lib/permissions";
import {
  parseSpecialties,
  serializeSpecialties,
  toDriveEmbedUrl,
} from "../../lib/academy";
import { validatePdfFile, MAX_PDF_FILES } from "../../lib/pdfValidation";
import { validateImageSource } from "../../lib/imageValidation";
import { formatLecture, formatFileMeta } from "../academy";

const router = Router();

const VALID_STATUSES = ["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"];

// GET /admin/academy/lectures — list ALL lectures (staff only)
router.get("/admin/academy/lectures", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة الأكاديمية" });
    return;
  }
  try {
    const statusFilter = typeof req.query.status === "string" ? req.query.status : "";
    const specialtyFilter =
      typeof req.query.specialty === "string" ? req.query.specialty.trim() : "";

    const conditions = [];
    if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
      conditions.push(eq(academyLecturesTable.status, statusFilter));
    }

    const base = db.select().from(academyLecturesTable);
    const rows = conditions.length
      ? await base.where(and(...conditions)).orderBy(sql`${academyLecturesTable.createdAt} DESC`)
      : await base.orderBy(sql`${academyLecturesTable.createdAt} DESC`);

    const filtered = specialtyFilter
      ? rows.filter(
          (r) =>
            r.isGeneral || parseSpecialties(r.allowedSpecialties).includes(specialtyFilter),
        )
      : rows;

    res.json(filtered.map((row) => formatLecture(row, { includeRaw: true })));
  } catch (err) {
    req.log.error({ err }, "admin academy list failed");
    res.status(500).json({ error: "تعذر تحميل المحاضرات" });
  }
});

// GET /admin/academy/files/:fileId — staff download any lecture PDF
router.get("/admin/academy/files/:fileId", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة الأكاديمية" });
    return;
  }
  const fileId = Number(req.params.fileId);
  if (!Number.isInteger(fileId)) {
    res.status(400).json({ error: "معرّف الملف غير صالح" });
    return;
  }
  try {
    const [row] = await db
      .select()
      .from(academyFilesTable)
      .where(eq(academyFilesTable.id, fileId))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "الملف غير موجود" });
      return;
    }
    res.json({
      id: row.id,
      fileName: row.fileName,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      fileData: row.fileData,
    });
  } catch (err) {
    req.log.error({ err }, "admin academy file download failed");
    res.status(500).json({ error: "تعذر تحميل الملف" });
  }
});

// POST /admin/academy/lectures — create a lecture (staff only)
router.post("/admin/academy/lectures", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة الأكاديمية" });
    return;
  }
  const parsed = CreateAdminAcademyLectureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات المحاضرة غير صحيحة" });
    return;
  }
  const d = parsed.data;

  const title = d.title.trim();
  const description = d.description.trim();
  const lecturerName = d.lecturerName.trim();
  if (!title || !description || !lecturerName) {
    res.status(400).json({ error: "يرجى تعبئة العنوان والوصف واسم المحاضر" });
    return;
  }

  const isGeneral = d.isGeneral ?? false;
  const allowedSpecialties = Array.isArray(d.allowedSpecialties) ? d.allowedSpecialties : [];
  if (!isGeneral && allowedSpecialties.length === 0) {
    res.status(400).json({ error: "يرجى اختيار اختصاص واحد على الأقل أو تحديد المحاضرة كعامة" });
    return;
  }

  const recordingDriveUrl = d.recordingDriveUrl?.trim() || null;
  let recordingEmbedUrl: string | null = null;
  if (recordingDriveUrl) {
    recordingEmbedUrl = toDriveEmbedUrl(recordingDriveUrl);
    if (!recordingEmbedUrl) {
      res.status(400).json({ error: "رابط Google Drive غير صالح" });
      return;
    }
  }

  const thumbnailUrl = d.thumbnailUrl?.trim() || null;
  const thumbnailError = validateImageSource(thumbnailUrl);
  if (thumbnailError) {
    res.status(400).json({ error: thumbnailError });
    return;
  }

  const attachments = Array.isArray(d.attachments) ? d.attachments : [];
  if (attachments.length > MAX_PDF_FILES) {
    res.status(400).json({ error: "لا يمكن رفع أكثر من 5 ملفات" });
    return;
  }
  const validFiles = [];
  for (const att of attachments) {
    const result = validatePdfFile(att);
    if ("error" in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    validFiles.push(result.file);
  }

  try {
    const [created] = await db
      .insert(academyLecturesTable)
      .values({
        title,
        description,
        lecturerName,
        lectureDate: d.lectureDate?.trim() || null,
        lectureTime: d.lectureTime?.trim() || null,
        isUpcoming: d.isUpcoming ?? false,
        liveMeetingUrl: d.liveMeetingUrl?.trim() || null,
        recordingDriveUrl,
        recordingEmbedUrl,
        thumbnailUrl,
        allowedSpecialties: serializeSpecialties(d.allowedSpecialties),
        isGeneral: d.isGeneral ?? false,
        status: d.status ?? "DRAFT",
        createdById: req.user!.userId,
      })
      .returning();

    if (validFiles.length > 0) {
      await db.insert(academyFilesTable).values(
        validFiles.map((f) => ({
          lectureId: created.id,
          fileName: f.fileName,
          mimeType: f.mimeType,
          fileSize: f.fileSize,
          fileData: f.fileData,
        })),
      );
    }

    const files = await db
      .select()
      .from(academyFilesTable)
      .where(eq(academyFilesTable.lectureId, created.id));
    res.status(201).json({ ...formatLecture(created, { includeRaw: true }), attachments: files.map(formatFileMeta) });
  } catch (err) {
    req.log.error({ err }, "admin academy create failed");
    res.status(500).json({ error: "تعذر إنشاء المحاضرة" });
  }
});

// PATCH /admin/academy/lectures/:id — update a lecture (staff only)
router.patch("/admin/academy/lectures/:id", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة الأكاديمية" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المحاضرة غير صالح" });
    return;
  }
  const parsed = UpdateAdminAcademyLectureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات المحاضرة غير صحيحة" });
    return;
  }
  const d = parsed.data;

  try {
    const [target] = await db
      .select()
      .from(academyLecturesTable)
      .where(eq(academyLecturesTable.id, id))
      .limit(1);
    if (!target) {
      res.status(404).json({ error: "المحاضرة غير موجودة" });
      return;
    }

    const updates: Partial<typeof academyLecturesTable.$inferInsert> = {};
    if (d.title !== undefined) updates.title = d.title.trim();
    if (d.description !== undefined) updates.description = d.description.trim();
    if (d.lecturerName !== undefined) updates.lecturerName = d.lecturerName.trim();
    if (d.lectureDate !== undefined) updates.lectureDate = d.lectureDate?.trim() || null;
    if (d.lectureTime !== undefined) updates.lectureTime = d.lectureTime?.trim() || null;
    if (d.isUpcoming !== undefined) updates.isUpcoming = d.isUpcoming;
    if (d.liveMeetingUrl !== undefined) updates.liveMeetingUrl = d.liveMeetingUrl?.trim() || null;
    if (d.thumbnailUrl !== undefined) {
      const thumb = d.thumbnailUrl?.trim() || null;
      const thumbError = validateImageSource(thumb);
      if (thumbError) {
        res.status(400).json({ error: thumbError });
        return;
      }
      updates.thumbnailUrl = thumb;
    }
    if (d.allowedSpecialties !== undefined) {
      updates.allowedSpecialties = serializeSpecialties(d.allowedSpecialties);
    }
    if (d.isGeneral !== undefined) updates.isGeneral = d.isGeneral;
    const effectiveGeneral =
      d.isGeneral !== undefined ? d.isGeneral : target.isGeneral;
    const effectiveSpecialties =
      d.allowedSpecialties !== undefined
        ? d.allowedSpecialties
        : parseSpecialties(target.allowedSpecialties);
    if (!effectiveGeneral && effectiveSpecialties.length === 0) {
      res.status(400).json({
        error: "يرجى اختيار اختصاص واحد على الأقل أو تحديد المحاضرة كعامة",
      });
      return;
    }
    if (d.status !== undefined) {
      if (!VALID_STATUSES.includes(d.status)) {
        res.status(400).json({ error: "حالة المحاضرة غير صالحة" });
        return;
      }
      updates.status = d.status;
    }
    if (d.recordingDriveUrl !== undefined) {
      const driveUrl = d.recordingDriveUrl?.trim() || null;
      if (driveUrl) {
        const embed = toDriveEmbedUrl(driveUrl);
        if (!embed) {
          res.status(400).json({ error: "رابط Google Drive غير صالح" });
          return;
        }
        updates.recordingDriveUrl = driveUrl;
        updates.recordingEmbedUrl = embed;
      } else {
        updates.recordingDriveUrl = null;
        updates.recordingEmbedUrl = null;
      }
    }

    // Optional attachment additions
    const attachments = Array.isArray(d.attachments) ? d.attachments : [];
    const existingCount = (
      await db
        .select({ value: sql<number>`count(*)::int` })
        .from(academyFilesTable)
        .where(eq(academyFilesTable.lectureId, id))
    )[0].value;
    if (attachments.length + existingCount > MAX_PDF_FILES) {
      res.status(400).json({ error: "لا يمكن رفع أكثر من 5 ملفات" });
      return;
    }
    const validFiles = [];
    for (const att of attachments) {
      const result = validatePdfFile(att);
      if ("error" in result) {
        res.status(400).json({ error: result.error });
        return;
      }
      validFiles.push(result.file);
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedById = req.user!.userId;
      await db.update(academyLecturesTable).set(updates).where(eq(academyLecturesTable.id, id));
    }
    if (validFiles.length > 0) {
      await db.insert(academyFilesTable).values(
        validFiles.map((f) => ({
          lectureId: id,
          fileName: f.fileName,
          mimeType: f.mimeType,
          fileSize: f.fileSize,
          fileData: f.fileData,
        })),
      );
    }

    const [updated] = await db
      .select()
      .from(academyLecturesTable)
      .where(eq(academyLecturesTable.id, id))
      .limit(1);
    const files = await db
      .select()
      .from(academyFilesTable)
      .where(eq(academyFilesTable.lectureId, id));
    res.json({ ...formatLecture(updated, { includeRaw: true }), attachments: files.map(formatFileMeta) });
  } catch (err) {
    req.log.error({ err }, "admin academy update failed");
    res.status(500).json({ error: "تعذر تحديث المحاضرة" });
  }
});

// DELETE /admin/academy/lectures/:id — soft-delete (archive) a lecture (staff only)
router.delete("/admin/academy/lectures/:id", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لإدارة الأكاديمية" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المحاضرة غير صالح" });
    return;
  }
  try {
    const [target] = await db
      .select()
      .from(academyLecturesTable)
      .where(eq(academyLecturesTable.id, id))
      .limit(1);
    if (!target) {
      res.status(404).json({ error: "المحاضرة غير موجودة" });
      return;
    }
    await db
      .update(academyLecturesTable)
      .set({ status: "ARCHIVED", updatedById: req.user!.userId })
      .where(eq(academyLecturesTable.id, id));
    res.json({ message: "تم أرشفة المحاضرة" });
  } catch (err) {
    req.log.error({ err }, "admin academy delete failed");
    res.status(500).json({ error: "تعذر حذف المحاضرة" });
  }
});

export default router;
