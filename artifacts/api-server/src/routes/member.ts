import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateMemberProfileBody, UpdateMemberPasswordBody, UploadMemberAvatarBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

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
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt?.toISOString() ?? null,
  };
}

router.get("/member/profile", requireAuth, async (req, res): Promise<void> => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json(formatUser(user));
  } catch (err) {
    req.log.error({ err }, "Get profile error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/member/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMemberProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const updates: Partial<typeof usersTable.$inferInsert> = {};
    if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone ?? undefined;
    if (parsed.data.whatsapp !== undefined) updates.whatsapp = parsed.data.whatsapp ?? undefined;
    if (parsed.data.birthDate !== undefined) updates.birthDate = parsed.data.birthDate ?? undefined;
    if (parsed.data.address !== undefined) updates.address = parsed.data.address ?? undefined;
    if (parsed.data.professionGroup !== undefined) updates.professionGroup = parsed.data.professionGroup ?? undefined;
    if (parsed.data.specialtyText !== undefined) updates.specialtyText = parsed.data.specialtyText ?? undefined;
    if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio ?? undefined;

    const [user] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, req.user!.userId))
      .returning();

    res.json(formatUser(user));
  } catch (err) {
    req.log.error({ err }, "Update profile error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/member/password", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMemberPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(usersTable)
      .set({ passwordHash: newHash })
      .where(eq(usersTable.id, req.user!.userId));

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    req.log.error({ err }, "Update password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/member/avatar", requireAuth, async (req, res): Promise<void> => {
  const parsed = UploadMemberAvatarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { imageData } = parsed.data;

  if (!imageData.startsWith("data:image/")) {
    res.status(400).json({ error: "Invalid image format. Must be a data URI." });
    return;
  }

  const sizeEstimate = (imageData.length * 3) / 4;
  if (sizeEstimate > 5 * 1024 * 1024) {
    res.status(400).json({ error: "Image too large. Maximum 5MB." });
    return;
  }

  try {
    const avatarUrl = imageData;

    const [user] = await db
      .update(usersTable)
      .set({ avatarUrl })
      .where(eq(usersTable.id, req.user!.userId))
      .returning();

    res.json({ avatarUrl: user.avatarUrl! });
  } catch (err) {
    req.log.error({ err }, "Upload avatar error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/member/stats", requireAuth, async (req, res): Promise<void> => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const now = new Date();
    const memberSince = user.createdAt;
    const daysActive = Math.floor((now.getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24));

    let completeness = 30;
    if (user.fullName) completeness += 20;
    if (user.phone) completeness += 15;
    if (user.bio) completeness += 20;
    if (user.avatarUrl) completeness += 15;
    completeness = Math.min(100, completeness);

    res.json({
      memberSince: memberSince.toISOString(),
      daysActive,
      profileCompleteness: completeness,
      role: user.role,
      status: user.status,
    });
  } catch (err) {
    req.log.error({ err }, "Get stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
