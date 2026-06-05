import { Router } from "express";
import {
  db,
  volunteerDelegationRequestsTable,
  volunteerDelegationFilesTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateVolunteerDelegationBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { validatePdfFile, MAX_PDF_FILES, type ParsedPdfFile } from "../lib/pdfValidation";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RequestRow = typeof volunteerDelegationRequestsTable.$inferSelect;
type FileRow = typeof volunteerDelegationFilesTable.$inferSelect;

function formatFileMeta(row: FileRow) {
  return {
    id: row.id,
    requestId: row.requestId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

function formatRequest(row: RequestRow, files: FileRow[]) {
  return {
    id: row.id,
    userId: row.userId,
    fullNameArabic: row.fullNameArabic,
    fullNameGerman: row.fullNameGerman,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    travelToSyriaFrom: row.travelToSyriaFrom,
    travelToSyriaTo: row.travelToSyriaTo,
    volunteerWorkDateText: row.volunteerWorkDateText,
    volunteerWorkType: row.volunteerWorkType,
    professionGroup: row.professionGroup,
    specialtyWithCertificate: row.specialtyWithCertificate,
    needsSyrianPracticeLicenseHelp: row.needsSyrianPracticeLicenseHelp,
    hasLogisticsEquipment: row.hasLogisticsEquipment,
    equipmentDetails: row.equipmentDetails ?? null,
    status: row.status,
    adminNotes: row.adminNotes ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    attachments: files.map(formatFileMeta),
  };
}

// POST /volunteer-delegations — authenticated ACTIVE user submits a request
router.post("/volunteer-delegations", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.status !== "ACTIVE") {
    res.status(403).json({ error: "حسابك غير مُفعّل، لا يمكنك إرسال الطلب" });
    return;
  }

  const parsed = CreateVolunteerDelegationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "البيانات المدخلة غير صالحة" });
    return;
  }
  const data = parsed.data;

  const fullNameArabic = data.fullNameArabic.trim();
  const fullNameGerman = data.fullNameGerman.trim();
  const phone = data.phone.trim();
  const whatsapp = data.whatsapp.trim();
  const email = data.email.trim();
  const travelToSyriaFrom = data.travelToSyriaFrom.trim();
  const travelToSyriaTo = data.travelToSyriaTo.trim();
  const volunteerWorkDateText = data.volunteerWorkDateText.trim();
  const volunteerWorkType = data.volunteerWorkType.trim();
  const professionGroup = data.professionGroup.trim();
  const specialtyWithCertificate = data.specialtyWithCertificate.trim();

  if (
    !fullNameArabic ||
    !fullNameGerman ||
    !phone ||
    !whatsapp ||
    !email ||
    !travelToSyriaFrom ||
    !travelToSyriaTo ||
    !volunteerWorkDateText ||
    !volunteerWorkType ||
    !professionGroup ||
    !specialtyWithCertificate
  ) {
    res.status(400).json({ error: "يرجى تعبئة جميع الحقول المطلوبة" });
    return;
  }

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "صيغة البريد الإلكتروني غير صالحة" });
    return;
  }

  if (travelToSyriaFrom > travelToSyriaTo) {
    res
      .status(400)
      .json({ error: "تاريخ النزول (من) يجب أن يكون قبل أو يساوي تاريخ النزول (إلى)" });
    return;
  }

  const hasLogisticsEquipment = data.hasLogisticsEquipment;
  const equipmentDetails = (data.equipmentDetails ?? "").trim();
  if (hasLogisticsEquipment && !equipmentDetails) {
    res.status(400).json({ error: "يرجى ذكر تفاصيل المعدات" });
    return;
  }

  const rawAttachments = Array.isArray(data.attachments) ? data.attachments : [];
  if (rawAttachments.length > MAX_PDF_FILES) {
    res.status(400).json({ error: "لا يمكن رفع أكثر من 5 ملفات" });
    return;
  }

  const validFiles: ParsedPdfFile[] = [];
  for (const att of rawAttachments) {
    const result = validatePdfFile(att);
    if ("error" in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    validFiles.push(result.file);
  }

  try {
    const [created] = await db
      .insert(volunteerDelegationRequestsTable)
      .values({
        userId: req.user!.userId,
        fullNameArabic,
        fullNameGerman,
        phone,
        whatsapp,
        email,
        travelToSyriaFrom,
        travelToSyriaTo,
        volunteerWorkDateText,
        volunteerWorkType,
        professionGroup,
        specialtyWithCertificate,
        needsSyrianPracticeLicenseHelp: data.needsSyrianPracticeLicenseHelp,
        hasLogisticsEquipment,
        equipmentDetails: hasLogisticsEquipment ? equipmentDetails : equipmentDetails || null,
        status: "SUBMITTED",
      })
      .returning();

    let fileRows: FileRow[] = [];
    if (validFiles.length > 0) {
      fileRows = await db
        .insert(volunteerDelegationFilesTable)
        .values(
          validFiles.map((f) => ({
            requestId: created.id,
            fileName: f.fileName,
            mimeType: f.mimeType,
            fileSize: f.fileSize,
            fileData: f.fileData,
          })),
        )
        .returning();
    }

    res.status(201).json(formatRequest(created, fileRows));
  } catch (err) {
    req.log.error({ err }, "volunteer delegation create failed");
    res.status(500).json({ error: "تعذر إرسال الطلب، يرجى المحاولة لاحقاً" });
  }
});

// GET /volunteer-delegations/my — the current user's own requests (metadata only)
router.get("/volunteer-delegations/my", requireAuth, async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(volunteerDelegationRequestsTable)
      .where(eq(volunteerDelegationRequestsTable.userId, req.user!.userId))
      .orderBy(sql`${volunteerDelegationRequestsTable.createdAt} DESC`);

    const ids = rows.map((r) => r.id);
    const files = ids.length
      ? await db
          .select()
          .from(volunteerDelegationFilesTable)
          .where(
            sql`${volunteerDelegationFilesTable.requestId} IN (${sql.join(
              ids.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          )
      : [];

    const byRequest = new Map<number, FileRow[]>();
    for (const f of files) {
      const list = byRequest.get(f.requestId) ?? [];
      list.push(f);
      byRequest.set(f.requestId, list);
    }

    res.json(rows.map((r) => formatRequest(r, byRequest.get(r.id) ?? [])));
  } catch (err) {
    req.log.error({ err }, "volunteer delegation my list failed");
    res.status(500).json({ error: "تعذر تحميل طلباتك" });
  }
});

// GET /volunteer-delegations/files/:fileId — owner downloads their own file
router.get(
  "/volunteer-delegations/files/:fileId",
  requireAuth,
  async (req, res): Promise<void> => {
    const fileId = Number(req.params.fileId);
    if (!Number.isInteger(fileId)) {
      res.status(400).json({ error: "معرّف الملف غير صالح" });
      return;
    }
    try {
      const [row] = await db
        .select({
          id: volunteerDelegationFilesTable.id,
          fileName: volunteerDelegationFilesTable.fileName,
          mimeType: volunteerDelegationFilesTable.mimeType,
          fileSize: volunteerDelegationFilesTable.fileSize,
          fileData: volunteerDelegationFilesTable.fileData,
          ownerId: volunteerDelegationRequestsTable.userId,
        })
        .from(volunteerDelegationFilesTable)
        .innerJoin(
          volunteerDelegationRequestsTable,
          eq(volunteerDelegationFilesTable.requestId, volunteerDelegationRequestsTable.id),
        )
        .where(eq(volunteerDelegationFilesTable.id, fileId))
        .limit(1);

      if (!row) {
        res.status(404).json({ error: "الملف غير موجود" });
        return;
      }
      // Strictly owner-only — staff download via the admin file endpoint.
      if (row.ownerId !== req.user!.userId) {
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
      req.log.error({ err }, "volunteer delegation file download failed");
      res.status(500).json({ error: "تعذر تحميل الملف" });
    }
  },
);

export default router;
