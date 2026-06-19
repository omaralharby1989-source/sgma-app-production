import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq, or, and, lt, gt, isNull } from "drizzle-orm";
import { SignupBody, LoginBody, ForgotPasswordBody, ResetPasswordBody } from "@workspace/api-zod";
import { signToken } from "../middlewares/auth";
import { parseSpecialties, specialtyFromProfessionGroup } from "../lib/academy";

const router = Router();

const NEUTRAL_RESET_MSG =
  "إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة لإعادة تعيين كلمة المرور.";

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    account: user.account,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    isDeveloper: user.isDeveloper,
    isActive: user.isActive,
    phone: user.phone ?? null,
    whatsapp: user.whatsapp ?? null,
    birthDate: user.birthDate ?? null,
    address: user.address ?? null,
    professionGroup: user.professionGroup ?? null,
    specialtyText: user.specialtyText ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    membershipNumber: user.membershipNumber ?? null,
    accessScope: user.accessScope ?? "FULL_APP",
    academySpecialty: user.academySpecialty ?? null,
    academyAllowedSpecialties: parseSpecialties(user.academyAllowedSpecialties),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt?.toISOString() ?? null,
  };
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fullName, account, email, password, phone, whatsapp, birthDate, address, professionGroup, specialtyText, membershipNumber } = parsed.data;

  const trimmedMembership = membershipNumber?.trim() ?? "";
  if (!trimmedMembership) {
    res.status(400).json({ error: "الرجاء إدخال رقم العضوية" });
    return;
  }

  const isNumeric = /^\d+$/.test(trimmedMembership);
  const isSyRequest = /^sy$/i.test(trimmedMembership);
  if (!isNumeric && !isSyRequest) {
    res.status(400).json({
      error: "رقم العضوية غير صحيح. أدخل رقم عضويتك الرقمي أو SY لأكاديمية سوريا.",
    });
    return;
  }

  const accessScope = isSyRequest ? "SYRIA_ACADEMY_ONLY" : "FULL_APP";
  const academySpecialty = isSyRequest ? specialtyFromProfessionGroup(professionGroup) : null;
  const storedMembership = isSyRequest ? null : trimmedMembership;

  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.account, account), eq(usersTable.email, email)))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "يوجد حساب مسجل بهذا البريد أو اسم المستخدم. جرّب تسجيل الدخول أو استخدم خيار نسيت كلمة المرور." });
      return;
    }

    if (storedMembership) {
      const [membershipConflict] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.membershipNumber, storedMembership))
        .limit(1);

      if (membershipConflict) {
        res.status(409).json({ error: "رقم العضوية مستخدم بالفعل" });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db
      .insert(usersTable)
      .values({
        fullName,
        account,
        email,
        passwordHash,
        role: "MEMBER",
        status: "PENDING",
        isDeveloper: false,
        isActive: false,
        phone,
        whatsapp,
        birthDate,
        address,
        professionGroup,
        specialtyText,
        membershipNumber: storedMembership,
        accessScope,
        academySpecialty,
      })
      .returning();

    res.status(201).json({
      message:
        "تم إرسال طلب التسجيل بنجاح. سيتم تفعيل حسابك بعد التحقق من رقم العضوية من قبل الإدارة.",
      status: "PENDING",
    });
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") {
      const detail = (err as { detail?: string })?.detail ?? "";
      if (detail.includes("membership_number")) {
        res.status(409).json({ error: "رقم العضوية مستخدم بالفعل" });
        return;
      }
      res.status(409).json({ error: "يوجد حساب مسجل بهذا البريد أو اسم المستخدم. جرّب تسجيل الدخول أو استخدم خيار نسيت كلمة المرور." });
      return;
    }
    req.log.error({ err }, "Signup error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { identifier, password, role } = parsed.data;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.account, identifier), eq(usersTable.email, identifier)))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (user.role !== role) {
      res.status(403).json({ error: "Role mismatch. Please select the correct role." });
      return;
    }

    if (user.status === "PENDING") {
      res.status(403).json({ error: "حسابك قيد المراجعة. سيتم تفعيله بعد التحقق من رقم العضوية من قبل الإدارة." });
      return;
    }

    if (user.status === "SUSPENDED" || !user.isActive) {
      res.status(403).json({ error: "تم إيقاف حسابك، يرجى التواصل مع الإدارة." });
      return;
    }

    const token = signToken({
      userId: user.id,
      account: user.account,
      role: user.role,
      status: user.status,
      accessScope: user.accessScope ?? "FULL_APP",
    });

    res.json({ token, user: formatUser(user) });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "الرجاء إدخال بريد إلكتروني صحيح" });
    return;
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    // Always return neutral response — never reveal whether email exists
    if (!user || user.status !== "ACTIVE" || !user.isActive) {
      res.json({ message: NEUTRAL_RESET_MSG });
      return;
    }

    // Generate secure random token (64-char hex)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    // Invalidate all previous unused tokens for this user by marking them expired now
    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokensTable.userId, user.id),
          isNull(passwordResetTokensTable.usedAt),
          gt(passwordResetTokensTable.expiresAt, new Date())
        )
      );

    // Store new token
    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      tokenHash,
      expiresAt,
      requestIp: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    // Build reset link
    const frontendOrigin =
      process.env.FRONTEND_URL ||
      (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : null) ||
      "https://sgma-app.org";
    const resetLink = `${frontendOrigin}/reset-password?token=${rawToken}`;

    // In development: log the reset link so it can be tested without SMTP
    if (process.env.NODE_ENV !== "production") {
      req.log.info({ resetLink, email }, "DEV: password reset link");
    }

    // TODO: configure SMTP/email provider (e.g. Resend, SendGrid, Nodemailer)
    // Required env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
    // or RESEND_API_KEY / SENDGRID_API_KEY
    // Until configured, the reset link is only logged in development.
    const emailProviderConfigured =
      !!(process.env.SMTP_HOST || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);

    if (emailProviderConfigured) {
      req.log.warn("Email provider configured but sending not yet implemented — add provider logic here");
    }

    res.json({ message: NEUTRAL_RESET_MSG });
  } catch (err) {
    req.log.error({ err }, "Forgot-password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صحيحة" });
    return;
  }

  const { token, newPassword } = parsed.data;

  if (newPassword.length < 6) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    return;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  try {
    const [record] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.tokenHash, tokenHash))
      .limit(1);

    if (!record) {
      res.status(400).json({ error: "رابط إعادة التعيين غير صحيح أو منتهي الصلاحية." });
      return;
    }

    if (record.usedAt !== null) {
      res.status(400).json({ error: "تم استخدام هذا الرابط من قبل. الرجاء طلب رابط جديد." });
      return;
    }

    if (record.expiresAt < new Date()) {
      res.status(400).json({ error: "انتهت صلاحية رابط إعادة التعيين. الرجاء طلب رابط جديد." });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, record.userId));

    // Mark token as used
    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, record.id));

    res.json({ message: "تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن." });
  } catch (err) {
    req.log.error({ err }, "Reset-password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
