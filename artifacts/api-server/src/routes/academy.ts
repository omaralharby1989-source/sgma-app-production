import { Router } from "express";
import {
  db,
  usersTable,
  academyLecturesTable,
  academyFilesTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import {
  parseSpecialties,
  viewableSpecialtiesForSyriaUser,
  lectureVisibleToSyriaUser,
} from "../lib/academy";

const router = Router();

type LectureRow = typeof academyLecturesTable.$inferSelect;
type FileRow = typeof academyFilesTable.$inferSelect;

function formatLecture(row: LectureRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    lecturerName: row.lecturerName,
    lectureDate: row.lectureDate ?? null,
    lectureTime: row.lectureTime ?? null,
    isUpcoming: row.isUpcoming,
    liveMeetingUrl: row.liveMeetingUrl ?? null,
    recordingDriveUrl: row.recordingDriveUrl ?? null,
    recordingEmbedUrl: row.recordingEmbedUrl ?? null,
    thumbnailUrl: row.thumbnailUrl ?? null,
    allowedSpecialties: parseSpecialties(row.allowedSpecialties),
    isGeneral: row.isGeneral,
    status: row.status,
    createdById: row.createdById,
    updatedById: row.updatedById ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

function formatFileMeta(row: FileRow) {
  return {
    id: row.id,
    lectureId: row.lectureId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

// Resolves the caller's viewability rule from their DB user record.
// FULL_APP callers (staff or normal members) see everything (all=true).
async function resolveViewable(
  userId: number,
): Promise<{ all: boolean; specialties: Set<string> }> {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!u) return { all: false, specialties: new Set(["GENERAL"]) };
  if ((u.accessScope ?? "FULL_APP") !== "SYRIA_ACADEMY_ONLY") {
    return { all: true, specialties: new Set() };
  }
  return viewableSpecialtiesForSyriaUser(u.academySpecialty, u.academyAllowedSpecialties);
}

// GET /academy/lectures — published recorded lectures visible to the caller
router.get("/academy/lectures", requireAuth, async (req, res): Promise<void> => {
  try {
    const viewable = await resolveViewable(req.user!.userId);
    const specialtyFilter =
      typeof req.query.specialty === "string" ? req.query.specialty.trim() : "";
    const upcomingParam =
      typeof req.query.upcoming === "string" ? req.query.upcoming : "";

    const conditions = [eq(academyLecturesTable.status, "PUBLISHED")];
    if (upcomingParam === "true") conditions.push(eq(academyLecturesTable.isUpcoming, true));
    if (upcomingParam === "false") conditions.push(eq(academyLecturesTable.isUpcoming, false));

    const rows = await db
      .select()
      .from(academyLecturesTable)
      .where(and(...conditions))
      .orderBy(sql`${academyLecturesTable.createdAt} DESC`);

    const visible = rows.filter((r) =>
      lectureVisibleToSyriaUser(r.isGeneral, r.allowedSpecialties, viewable),
    );

    const filtered = specialtyFilter
      ? visible.filter(
          (r) =>
            r.isGeneral ||
            parseSpecialties(r.allowedSpecialties).includes(specialtyFilter),
        )
      : visible;

    res.json(filtered.map(formatLecture));
  } catch (err) {
    req.log.error({ err }, "academy lectures list failed");
    res.status(500).json({ error: "تعذر تحميل المحاضرات" });
  }
});

// GET /academy/announcements — published upcoming lectures visible to the caller
router.get("/academy/announcements", requireAuth, async (req, res): Promise<void> => {
  try {
    const viewable = await resolveViewable(req.user!.userId);
    const rows = await db
      .select()
      .from(academyLecturesTable)
      .where(
        and(
          eq(academyLecturesTable.status, "PUBLISHED"),
          eq(academyLecturesTable.isUpcoming, true),
        ),
      )
      .orderBy(sql`${academyLecturesTable.createdAt} DESC`);

    const visible = rows.filter((r) =>
      lectureVisibleToSyriaUser(r.isGeneral, r.allowedSpecialties, viewable),
    );
    res.json(visible.map(formatLecture));
  } catch (err) {
    req.log.error({ err }, "academy announcements failed");
    res.status(500).json({ error: "تعذر تحميل الإعلانات" });
  }
});

// GET /academy/files/:fileId — download a lecture PDF (must be a visible published lecture)
router.get("/academy/files/:fileId", requireAuth, async (req, res): Promise<void> => {
  const fileId = Number(req.params.fileId);
  if (!Number.isInteger(fileId)) {
    res.status(400).json({ error: "معرّف الملف غير صالح" });
    return;
  }
  try {
    const [row] = await db
      .select({
        id: academyFilesTable.id,
        fileName: academyFilesTable.fileName,
        mimeType: academyFilesTable.mimeType,
        fileSize: academyFilesTable.fileSize,
        fileData: academyFilesTable.fileData,
        lectureStatus: academyLecturesTable.status,
        isGeneral: academyLecturesTable.isGeneral,
        allowedSpecialties: academyLecturesTable.allowedSpecialties,
      })
      .from(academyFilesTable)
      .innerJoin(
        academyLecturesTable,
        eq(academyFilesTable.lectureId, academyLecturesTable.id),
      )
      .where(eq(academyFilesTable.id, fileId))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "الملف غير موجود" });
      return;
    }
    if (row.lectureStatus !== "PUBLISHED") {
      res.status(404).json({ error: "الملف غير متاح" });
      return;
    }
    const viewable = await resolveViewable(req.user!.userId);
    if (!lectureVisibleToSyriaUser(row.isGeneral, row.allowedSpecialties, viewable)) {
      res.status(403).json({ error: "ليس لديك صلاحية للوصول إلى هذا الملف" });
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
    req.log.error({ err }, "academy file download failed");
    res.status(500).json({ error: "تعذر تحميل الملف" });
  }
});

// GET /academy/lectures/:id — lecture detail if visible to the caller
router.get("/academy/lectures/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف المحاضرة غير صالح" });
    return;
  }
  try {
    const [row] = await db
      .select()
      .from(academyLecturesTable)
      .where(eq(academyLecturesTable.id, id))
      .limit(1);

    if (!row || row.status !== "PUBLISHED") {
      res.status(404).json({ error: "المحاضرة غير موجودة أو غير متاحة" });
      return;
    }
    const viewable = await resolveViewable(req.user!.userId);
    if (!lectureVisibleToSyriaUser(row.isGeneral, row.allowedSpecialties, viewable)) {
      res.status(403).json({ error: "ليس لديك صلاحية لعرض هذه المحاضرة" });
      return;
    }

    const files = await db
      .select()
      .from(academyFilesTable)
      .where(eq(academyFilesTable.lectureId, id))
      .orderBy(sql`${academyFilesTable.createdAt} ASC`);

    res.json({ ...formatLecture(row), attachments: files.map(formatFileMeta) });
  } catch (err) {
    req.log.error({ err }, "academy lecture detail failed");
    res.status(500).json({ error: "تعذر تحميل المحاضرة" });
  }
});

export default router;
export { formatLecture, formatFileMeta };
