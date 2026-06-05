import { Router } from "express";
import { db, staticPagesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateStaticPageBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const DEVELOPER_EMAIL = "lordhygm@gmail.com";

const ALLOWED_SLUGS = ["privacy-policy", "terms", "about-sgma"] as const;
type AllowedSlug = (typeof ALLOWED_SLUGS)[number];

function isAllowedSlug(slug: string): slug is AllowedSlug {
  return (ALLOWED_SLUGS as readonly string[]).includes(slug);
}

const SEED: Record<AllowedSlug, { title: string; content: string }> = {
  "privacy-policy": {
    title: "سياسة الخصوصية",
    content: `سياسة الخصوصية

1. من نحن
نحن الجمعية الطبية السورية الألمانية (SGMA)، جمعية غير ربحية قيد التسجيل في ألمانيا، تهدف إلى دعم وتمكين الأطباء السوريين وتعزيز العمل الطبي الإنساني.

2. البيانات التي نجمعها
نقوم بجمع بعض المعلومات الشخصية عند استخدامك لموقعنا أو خدماتنا، مثل:

الاسم الكامل
البريد الإلكتروني
التخصص الطبي
بيانات التصفح (مثل عنوان IP ونوع المتصفح)

نستخدم هذه البيانات فقط للأغراض التي جُمعت من أجلها، مثل إدارة العضوية والتواصل معك بشأن فعاليات الجمعية.

3. استخدام ملفات تعريف الارتباط (Cookies)
يستخدم موقعنا ملفات تعريف الارتباط لتحسين تجربة المستخدم وتحليل أداء الموقع. يمكنك تعديل إعدادات المتصفح الخاص بك للتحكم في استخدام هذه الملفات.

4. مشاركة البيانات
نحن لا نشارك بياناتك الشخصية مع أطراف ثالثة إلا في الحالات الضرورية، مثل:

الامتثال للمتطلبات القانونية
التعامل مع مزودي الخدمات التقنيين الذين يساعدوننا في تشغيل الموقع، مع ضمان التزامهم بسياسات الخصوصية الصارمة

5. مدة الاحتفاظ بالبيانات
نحتفظ ببياناتك الشخصية فقط للمدة اللازمة لتحقيق الأغراض التي جُمعت من أجلها، أو كما هو مطلوب بموجب القوانين المعمول بها.

6. حقوقك
بموجب اللائحة العامة لحماية البيانات (GDPR)، لديك الحقوق التالية:

الاطلاع على بياناتك الشخصية التي نحتفظ بها
طلب تصحيح أو حذف بياناتك
الاعتراض على معالجة بياناتك
سحب موافقتك في أي وقت

لممارسة أي من هذه الحقوق، يرجى التواصل معنا عبر البريد الإلكتروني:

info@sgma-med.org

7. التعديلات على سياسة الخصوصية
قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ السريان أدناه.`,
  },
  terms: {
    title: "الشروط والأحكام",
    content: `الشروط والأحكام

1. مقدمة
مرحباً بك في الموقع الرسمي للجمعية الطبية السورية الألمانية (SGMA). باستخدامك لهذا الموقع، فإنك توافق على الالتزام بالشروط والأحكام التالية. إذا كنت لا توافق على أي جزء منها، يُرجى التوقف عن استخدام الموقع.

2. استخدام الموقع
يُسمح باستخدام هذا الموقع فقط لأغراض شخصية، مهنية، أو تطوعية تتعلق بأهداف الجمعية.

يُمنع استخدام الموقع بأي طريقة تنتهك القوانين المعمول بها أو تمس بحقوق الجمعية أو المستخدمين الآخرين.

تحتفظ الجمعية بحق تعديل أو تقييد أو إيقاف الوصول إلى الموقع أو إلى أجزاء منه، في أي وقت، ودون إشعار مسبق.

3. العضوية والتسجيل
تتيح الجمعية للعاملين في المجال الصحي من السوريين فرصة الانضمام إليها بسهولة.

يمكن أيضاً للمتطوعين من خارج الوسط الطبي التقديم للمساهمة ضمن أطر واضحة.

يجب أن تكون جميع المعلومات المقدمة صحيحة وكاملة.

تحتفظ الجمعية بحق قبول أو رفض الطلبات وفقاً لمعاييرها الداخلية.

4. حماية البيانات
نلتزم بحماية بياناتك كما هو موضح في سياسة الخصوصية. باستخدام الموقع، فإنك توافق على شروط السياسة.

5. حقوق الملكية الفكرية
جميع المحتويات على الموقع مملوكة للجمعية أو مستخدمة بترخيص رسمي.

يُمنع نسخ أو استخدام أي جزء منها دون إذن مسبق.`,
  },
  "about-sgma": {
    title: "من نحن",
    content: `من نحن

الجمعية الطبية السورية الألمانية هي منظمة طبية غير ربحية، مستقلة، تأسست بمبادرة من عاملين في المجال الصحي سوريين يعملون في ألمانيا، إيمانًا بدور الطب والصيدلة كجسر إنساني وعلمي يربط بين الشعوب، وبمسؤولية الكفاءات الصحية السورية في المساهمة بإعادة بناء وتطوير النظام الصحي في سوريا، وتعزيز حضور العاملين الصحيين السوريين في المجتمع الطبي الألماني.

تعمل الجمعية على دعم القطاع الصحي في سوريا عبر تنظيم مهمات طبية تخصصية، إجراء عمليات نوعية، توفير الاستشارات والخدمات العلاجية، إضافة إلى التركيز على التدريب وبناء القدرات ونقل الخبرات الطبية الحديثة إلى الداخل السوري بالتعاون مع المؤسسات الصحية المحلية.

وفي ألمانيا، تسعى سِجما إلى تمثيل الأطباء والصيادلة والعاملين الصحيين السوريين، ودعم اندماجهم المهني، وتعزيز حضورهم الأكاديمي والعلمي، وفتح مساحات للحوار والتعاون مع المؤسسات الطبية والبحثية الألمانية.

تؤمن الجمعية بأن العمل الطبي لا يقتصر على العلاج فقط، بل يشمل التعليم، وبناء الإنسان، وترسيخ قيم المهنية، والاستقلالية، والعمل التطوعي، والالتزام الأخلاقي.

ومن هذا المنطلق، تشكّل سِجما منصة تجمع بين الخبرة الطبية، والمسؤولية الإنسانية، والرؤية المستقبلية لخدمة الإنسان أينما كان.`,
  },
};

const router = Router();

function formatPage(row: typeof staticPagesTable.$inferSelect) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedById: row.updatedById ?? null,
  };
}

// Guarantees the canonical row for an allowed slug exists, seeding it on a
// fresh database so the public page is always available. Safe to call
// repeatedly — never creates duplicate rows (slug is unique).
async function ensurePageRow(
  slug: AllowedSlug,
): Promise<typeof staticPagesTable.$inferSelect> {
  const existing = await db.query.staticPagesTable.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(staticPagesTable)
    .values({
      slug,
      title: SEED[slug].title,
      content: SEED[slug].content,
    })
    .onConflictDoNothing({ target: staticPagesTable.slug })
    .returning();

  if (created) return created;

  // Lost an insert race — fetch the row the other request created.
  const row = await db.query.staticPagesTable.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  });
  return row!;
}

router.get("/static-pages/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  if (!isAllowedSlug(slug)) {
    res.status(404).json({ error: "الصفحة غير موجودة" });
    return;
  }
  try {
    const row = await ensurePageRow(slug);
    res.json(formatPage(row));
  } catch (err) {
    req.log.error({ err }, "static_page read failed");
    res.status(500).json({ error: "تعذر تحميل الصفحة" });
  }
});

router.patch(
  "/static-pages/:slug",
  requireAuth,
  async (req, res): Promise<void> => {
    const slug = String(req.params.slug);
    if (!isAllowedSlug(slug)) {
      res.status(404).json({ error: "الصفحة غير موجودة" });
      return;
    }

    const parsed = UpdateStaticPageBody.safeParse(req.body);
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
        res.status(403).json({ error: "غير مصرح لك بتعديل هذه الصفحة" });
        return;
      }

      const row = await ensurePageRow(slug);
      const { title, content } = parsed.data;

      const [updated] = await db
        .update(staticPagesTable)
        .set({ title, content, updatedById: user.id })
        .where(eq(staticPagesTable.id, row.id))
        .returning();

      res.json(formatPage(updated));
    } catch (err) {
      req.log.error({ err }, "static_page update failed");
      res.status(500).json({ error: "تعذر تحديث الصفحة" });
    }
  },
);

export default router;
