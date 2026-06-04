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
    phone: user.phone ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
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

  const { fullName, account, email, password, role, phone, bio } = parsed.data;

  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.account, account), eq(usersTable.email, email)))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Account or email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(usersTable)
      .values({
        fullName,
        account,
        email,
        passwordHash,
        role: role as "MEMBER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN",
        status: "ACTIVE",
        phone: phone ?? null,
        bio: bio ?? null,
      })
      .returning();

    const token = signToken({
      userId: user.id,
      account: user.account,
      role: user.role,
      status: user.status,
    });

    res.status(201).json({ token, user: formatUser(user) });
  } catch (err) {
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

    if (user.status === "SUSPENDED") {
      res.status(403).json({ error: "Your account has been suspended. Contact an administrator." });
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
