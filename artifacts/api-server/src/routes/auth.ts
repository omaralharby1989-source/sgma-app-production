import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import { signToken } from "../middlewares/auth";

const router = Router();

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

  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.account, account), eq(usersTable.email, email)))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل" });
      return;
    }

    const [membershipConflict] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.membershipNumber, trimmedMembership))
      .limit(1);

    if (membershipConflict) {
      res.status(409).json({ error: "رقم العضوية مستخدم بالفعل" });
      return;
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
        membershipNumber: trimmedMembership,
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
      res.status(409).json({ error: "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل" });
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
    });

    res.json({ token, user: formatUser(user) });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
