import { Router } from "express";
import { db, developerInfoTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateDeveloperInfoBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const DEVELOPER_EMAIL = "lordhygm@gmail.com";

const SEED = {
  name: "عمر الحربي",
  title: "مطور التطبيق",
  description:
    "عمر الحربي يعمل كممرض اختصاص تخدير وعناية مركزة، وهو المنسق العام في لجنة المساعدين الطبيين والتمريض في الجمعية الطبية السورية الألمانية SGMA، وعضو مجلس الإدارة.",
  roleDescription:
    "ساهم في تطوير هذا التطبيق بهدف خدمة أعضاء الجمعية وتسهيل التواصل الداخلي، وتنظيم الأخبار والمقالات والبث الإداري بطريقة حديثة وآمنة. يجمع عمر الحربي بين الخبرة المهنية في المجال الصحي والعمل التنظيمي داخل SGMA، مع اهتمام واضح بتطوير الأدوات الرقمية التي تدعم الكوادر الطبية والتمريضية.",
  phone: "017634443419",
  email: DEVELOPER_EMAIL,
};

const router = Router();

function formatInfo(row: typeof developerInfoTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name ?? "",
    title: row.title ?? "",
    description: row.description ?? "",
    roleDescription: row.roleDescription ?? null,
    phone: row.phone ?? "",
    email: row.email ?? "",
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedById: row.updatedById ?? null,
  };
}

// Guarantees exactly one active developer_info row exists, seeding the
// canonical record on a fresh database so the public card is always available.
async function ensureInfoRow(): Promise<typeof developerInfoTable.$inferSelect> {
  const existing = await db.query.developerInfoTable.findFirst({
    where: (t, { eq }) => eq(t.isActive, true),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(developerInfoTable)
    .values({
      appName: "SGMA APP2",
      version: "1.0.0",
      developer: SEED.name,
      contact: SEED.email,
      description: SEED.description,
      roleDescription: SEED.roleDescription,
      name: SEED.name,
      title: SEED.title,
      phone: SEED.phone,
      email: SEED.email,
      isActive: true,
    })
    .returning();
  return created;
}

router.get("/developer-info", async (req, res): Promise<void> => {
  try {
    const row = await ensureInfoRow();
    res.json(formatInfo(row));
  } catch (err) {
    req.log.error({ err }, "developer_info read failed");
    res.status(500).json({ error: "تعذر تحميل معلومات المطور" });
  }
});

router.patch("/developer-info", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateDeveloperInfoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);

    if (!user || user.email !== DEVELOPER_EMAIL || user.isDeveloper !== true) {
      res.status(403).json({ error: "غير مصرح لك بتعديل معلومات المطور" });
      return;
    }

    const row = await ensureInfoRow();
    const { name, title, description, roleDescription, phone, email } = parsed.data;

    const [updated] = await db
      .update(developerInfoTable)
      .set({
        name,
        title,
        description,
        roleDescription: roleDescription ?? null,
        phone,
        email,
        updatedById: user.id,
      })
      .where(eq(developerInfoTable.id, row.id))
      .returning();

    res.json(formatInfo(updated));
  } catch (err) {
    req.log.error({ err }, "developer_info update failed");
    res.status(500).json({ error: "تعذر تحديث معلومات المطور" });
  }
});

export default router;
