import { Router } from "express";
import {
  db,
  volunteerDelegationRequestsTable,
  volunteerDelegationFilesTable,
  usersTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { UpdateAdminVolunteerDelegationBody } from "@workspace/api-zod";
import { requireAuth } from "../../middlewares/auth";
import { isStaff } from "../../lib/permissions";

const router = Router();

const VALID_STATUSES = ["SUBMITTED", "IN_REVIEW", "ACCEPTED", "REJECTED", "ARCHIVED"];

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

function formatAdminRequest(
  row: RequestRow,
  files: FileRow[],
  userFullName: string | null,
  userAccount: string | null,
) {
  return {
    id: row.id,
    userId: row.userId,
    userFullName: userFullName ?? null,
    userAccount: userAccount ?? null,
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
    reviewedById: row.reviewedById ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    attachments: files.map(formatFileMeta),
  };
}

async function filesForRequests(ids: number[]): Promise<Map<number, FileRow[]>> {
  const byRequest = new Map<number, FileRow[]>();
  if (ids.length === 0) return byRequest;
  const files = await db
    .select()
    .from(volunteerDelegationFilesTable)
    .where(
      sql`${volunteerDelegationFilesTable.requestId} IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  for (const f of files) {
    const list = byRequest.get(f.requestId) ?? [];
    list.push(f);
    byRequest.set(f.requestId, list);
  }
  return byRequest;
}

// GET /admin/volunteer-delegations?status= — staff only
router.get("/admin/volunteer-delegations", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لعرض طلبات الوفود" });
    return;
  }

  try {
    const statusFilter = typeof req.query.status === "string" ? req.query.status : "";

    const base = db
      .select({
        request: volunteerDelegationRequestsTable,
        userFullName: usersTable.fullName,
        userAccount: usersTable.account,
      })
      .from(volunteerDelegationRequestsTable)
      .leftJoin(usersTable, eq(volunteerDelegationRequestsTable.userId, usersTable.id));

    const rows =
      statusFilter && VALID_STATUSES.includes(statusFilter)
        ? await base
            .where(eq(volunteerDelegationRequestsTable.status, statusFilter))
            .orderBy(sql`${volunteerDelegationRequestsTable.createdAt} DESC`)
            .limit(300)
        : await base
            .orderBy(sql`${volunteerDelegationRequestsTable.createdAt} DESC`)
            .limit(300);

    const byRequest = await filesForRequests(rows.map((r) => r.request.id));
    res.json(
      rows.map((r) =>
        formatAdminRequest(
          r.request,
          byRequest.get(r.request.id) ?? [],
          r.userFullName,
          r.userAccount,
        ),
      ),
    );
  } catch (err) {
    req.log.error({ err }, "admin volunteer delegations list failed");
    res.status(500).json({ error: "تعذر تحميل طلبات الوفود" });
  }
});

// GET /admin/volunteer-delegations/files/:fileId — staff only (registered before :id)
router.get(
  "/admin/volunteer-delegations/files/:fileId",
  requireAuth,
  async (req, res): Promise<void> => {
    if (!isStaff(req.user!.role)) {
      res.status(403).json({ error: "ليس لديك صلاحية للوصول إلى هذا الملف" });
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
        .from(volunteerDelegationFilesTable)
        .where(eq(volunteerDelegationFilesTable.id, fileId))
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
      req.log.error({ err }, "admin volunteer delegation file download failed");
      res.status(500).json({ error: "تعذر تحميل الملف" });
    }
  },
);

// GET /admin/volunteer-delegations/:id — staff only
router.get("/admin/volunteer-delegations/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لعرض طلبات الوفود" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الطلب غير صالح" });
    return;
  }
  try {
    const [row] = await db
      .select({
        request: volunteerDelegationRequestsTable,
        userFullName: usersTable.fullName,
        userAccount: usersTable.account,
      })
      .from(volunteerDelegationRequestsTable)
      .leftJoin(usersTable, eq(volunteerDelegationRequestsTable.userId, usersTable.id))
      .where(eq(volunteerDelegationRequestsTable.id, id))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    const byRequest = await filesForRequests([row.request.id]);
    res.json(
      formatAdminRequest(
        row.request,
        byRequest.get(row.request.id) ?? [],
        row.userFullName,
        row.userAccount,
      ),
    );
  } catch (err) {
    req.log.error({ err }, "admin volunteer delegation get failed");
    res.status(500).json({ error: "تعذر تحميل الطلب" });
  }
});

// PATCH /admin/volunteer-delegations/:id — staff only; update status + adminNotes
router.patch("/admin/volunteer-delegations/:id", requireAuth, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لتعديل طلبات الوفود" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الطلب غير صالح" });
    return;
  }

  const parsed = UpdateAdminVolunteerDelegationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "البيانات المدخلة غير صالحة" });
    return;
  }
  const data = parsed.data;
  if (!VALID_STATUSES.includes(data.status)) {
    res.status(400).json({ error: "حالة الطلب غير صالحة" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(volunteerDelegationRequestsTable)
      .where(eq(volunteerDelegationRequestsTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    const [updated] = await db
      .update(volunteerDelegationRequestsTable)
      .set({
        status: data.status,
        adminNotes:
          data.adminNotes === undefined ? existing.adminNotes : data.adminNotes?.trim() || null,
        reviewedById: req.user!.userId,
      })
      .where(eq(volunteerDelegationRequestsTable.id, id))
      .returning();

    const [userRow] = await db
      .select({ fullName: usersTable.fullName, account: usersTable.account })
      .from(usersTable)
      .where(eq(usersTable.id, updated.userId))
      .limit(1);

    const byRequest = await filesForRequests([updated.id]);
    res.json(
      formatAdminRequest(
        updated,
        byRequest.get(updated.id) ?? [],
        userRow?.fullName ?? null,
        userRow?.account ?? null,
      ),
    );
  } catch (err) {
    req.log.error({ err }, "admin volunteer delegation update failed");
    res.status(500).json({ error: "تعذر تحديث الطلب" });
  }
});

export default router;
