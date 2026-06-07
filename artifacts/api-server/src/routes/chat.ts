import { Router } from "express";
import {
  db,
  usersTable,
  publicChatMessagesTable,
  adminDirectChatMessagesTable,
  chatPresenceTable,
} from "@workspace/db";
import { eq, desc, asc, sql, and, gte } from "drizzle-orm";
import {
  SendPublicChatMessageBody,
  EditPublicChatMessageBody,
  SendAdminChatMessageBody,
  EditAdminChatMessageBody,
  UpdateChatPresenceBody,
} from "@workspace/api-zod";
import { requireAuth, requireFullApp } from "../middlewares/auth";

const router = Router();

const STAFF_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];
const DELETED_TEXT = "تم حذف هذه الرسالة";

function isStaff(role: string): boolean {
  return STAFF_ROLES.includes(role);
}

type MessageRow = {
  id: number;
  content: string;
  isDeleted: boolean;
  editedAt: Date | null;
  createdAt: Date;
  senderId: number;
  senderName: string;
  senderRole: string;
  senderAvatarUrl: string | null;
};

function formatMessage(row: MessageRow, viewer: { userId: number; role: string }) {
  const isMine = row.senderId === viewer.userId;
  const canModerate = isMine || isStaff(viewer.role);
  return {
    id: row.id,
    content: row.isDeleted ? DELETED_TEXT : row.content,
    senderId: row.senderId,
    senderName: row.senderName,
    senderRole: row.senderRole,
    senderAvatarUrl: row.senderAvatarUrl,
    isDeleted: row.isDeleted,
    isMine,
    canModerate: row.isDeleted ? false : canModerate,
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public chat
// ---------------------------------------------------------------------------

router.get("/chat/public/messages", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: publicChatMessagesTable.id,
        content: publicChatMessagesTable.content,
        isDeleted: publicChatMessagesTable.isDeleted,
        editedAt: publicChatMessagesTable.editedAt,
        createdAt: publicChatMessagesTable.createdAt,
        senderId: publicChatMessagesTable.senderId,
        senderName: usersTable.fullName,
        senderRole: usersTable.role,
        senderAvatarUrl: usersTable.avatarUrl,
      })
      .from(publicChatMessagesTable)
      .innerJoin(usersTable, eq(publicChatMessagesTable.senderId, usersTable.id))
      .orderBy(desc(publicChatMessagesTable.id))
      .limit(100);

    const ordered = rows.reverse();
    res.json(ordered.map((r) => formatMessage(r, req.user!)));
  } catch (err) {
    req.log.error({ err }, "Get public messages error");
    res.status(500).json({ error: "فشل تحميل الرسائل" });
  }
});

router.post("/chat/public/messages", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  const parsed = SendPublicChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "لا يمكن إرسال رسالة فارغة" });
    return;
  }
  const content = parsed.data.content.trim();
  if (!content) {
    res.status(400).json({ error: "لا يمكن إرسال رسالة فارغة" });
    return;
  }

  try {
    const [created] = await db
      .insert(publicChatMessagesTable)
      .values({ senderId: req.user!.userId, content })
      .returning();

    const [sender] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);

    res.status(201).json(
      formatMessage(
        {
          id: created.id,
          content: created.content,
          isDeleted: created.isDeleted,
          editedAt: created.editedAt,
          createdAt: created.createdAt,
          senderId: created.senderId,
          senderName: sender.fullName,
          senderRole: sender.role,
          senderAvatarUrl: sender.avatarUrl,
        },
        req.user!,
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Send public message error");
    res.status(500).json({ error: "تعذر إرسال الرسالة" });
  }
});

router.patch("/chat/public/messages/:id", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الرسالة غير صحيح" });
    return;
  }
  const parsed = EditPublicChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "لا يمكن إرسال رسالة فارغة" });
    return;
  }
  const content = parsed.data.content.trim();
  if (!content) {
    res.status(400).json({ error: "لا يمكن إرسال رسالة فارغة" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(publicChatMessagesTable)
      .where(eq(publicChatMessagesTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "الرسالة غير موجودة" });
      return;
    }
    if (existing.isDeleted) {
      res.status(400).json({ error: "لا يمكن تعديل رسالة محذوفة" });
      return;
    }
    if (existing.senderId !== req.user!.userId) {
      res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
      return;
    }

    const [updated] = await db
      .update(publicChatMessagesTable)
      .set({ content, editedAt: new Date() })
      .where(eq(publicChatMessagesTable.id, id))
      .returning();

    const [sender] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, updated.senderId))
      .limit(1);

    res.json(
      formatMessage(
        {
          id: updated.id,
          content: updated.content,
          isDeleted: updated.isDeleted,
          editedAt: updated.editedAt,
          createdAt: updated.createdAt,
          senderId: updated.senderId,
          senderName: sender.fullName,
          senderRole: sender.role,
          senderAvatarUrl: sender.avatarUrl,
        },
        req.user!,
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Edit public message error");
    res.status(500).json({ error: "تعذر تعديل الرسالة" });
  }
});

router.delete("/chat/public/messages/:id", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الرسالة غير صحيح" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(publicChatMessagesTable)
      .where(eq(publicChatMessagesTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "الرسالة غير موجودة" });
      return;
    }

    const owns = existing.senderId === req.user!.userId;
    if (!owns && !isStaff(req.user!.role)) {
      res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
      return;
    }

    const [updated] = await db
      .update(publicChatMessagesTable)
      .set({ isDeleted: true })
      .where(eq(publicChatMessagesTable.id, id))
      .returning();

    const [sender] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, updated.senderId))
      .limit(1);

    res.json(
      formatMessage(
        {
          id: updated.id,
          content: updated.content,
          isDeleted: updated.isDeleted,
          editedAt: updated.editedAt,
          createdAt: updated.createdAt,
          senderId: updated.senderId,
          senderName: sender.fullName,
          senderRole: sender.role,
          senderAvatarUrl: sender.avatarUrl,
        },
        req.user!,
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Delete public message error");
    res.status(500).json({ error: "تعذر حذف الرسالة" });
  }
});

// ---------------------------------------------------------------------------
// Admin direct chat
// ---------------------------------------------------------------------------

router.get("/chat/admin/conversations", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  if (!isStaff(req.user!.role)) {
    res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
    return;
  }

  try {
    const rows = await db
      .select({
        userId: adminDirectChatMessagesTable.conversationUserId,
        fullName: usersTable.fullName,
        role: usersTable.role,
        avatarUrl: usersTable.avatarUrl,
        lastMessage: sql<string>`(array_agg(${adminDirectChatMessagesTable.content} ORDER BY ${adminDirectChatMessagesTable.id} DESC))[1]`,
        lastIsDeleted: sql<boolean>`(array_agg(${adminDirectChatMessagesTable.isDeleted} ORDER BY ${adminDirectChatMessagesTable.id} DESC))[1]`,
        lastMessageAt: sql<Date>`max(${adminDirectChatMessagesTable.createdAt})`,
      })
      .from(adminDirectChatMessagesTable)
      .innerJoin(usersTable, eq(adminDirectChatMessagesTable.conversationUserId, usersTable.id))
      .groupBy(
        adminDirectChatMessagesTable.conversationUserId,
        usersTable.fullName,
        usersTable.role,
        usersTable.avatarUrl,
      )
      .orderBy(desc(sql`max(${adminDirectChatMessagesTable.createdAt})`));

    res.json(
      rows.map((r) => ({
        userId: r.userId,
        fullName: r.fullName,
        role: r.role,
        avatarUrl: r.avatarUrl,
        lastMessage: r.lastIsDeleted ? DELETED_TEXT : r.lastMessage,
        lastMessageAt: new Date(r.lastMessageAt).toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Get admin conversations error");
    res.status(500).json({ error: "فشل تحميل المحادثات" });
  }
});

router.get("/chat/admin/messages", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  const staff = isStaff(req.user!.role);
  let conversationUserId: number;

  if (staff) {
    const userId = Number(req.query.userId);
    if (!Number.isInteger(userId)) {
      res.status(400).json({ error: "الرجاء تحديد المحادثة" });
      return;
    }
    conversationUserId = userId;
  } else {
    conversationUserId = req.user!.userId;
  }

  try {
    const rows = await db
      .select({
        id: adminDirectChatMessagesTable.id,
        content: adminDirectChatMessagesTable.content,
        isDeleted: adminDirectChatMessagesTable.isDeleted,
        editedAt: adminDirectChatMessagesTable.editedAt,
        createdAt: adminDirectChatMessagesTable.createdAt,
        senderId: adminDirectChatMessagesTable.senderId,
        senderName: usersTable.fullName,
        senderRole: usersTable.role,
        senderAvatarUrl: usersTable.avatarUrl,
      })
      .from(adminDirectChatMessagesTable)
      .innerJoin(usersTable, eq(adminDirectChatMessagesTable.senderId, usersTable.id))
      .where(eq(adminDirectChatMessagesTable.conversationUserId, conversationUserId))
      .orderBy(asc(adminDirectChatMessagesTable.id));

    res.json(rows.map((r) => formatMessage(r, req.user!)));
  } catch (err) {
    req.log.error({ err }, "Get admin messages error");
    res.status(500).json({ error: "فشل تحميل الرسائل" });
  }
});

router.post("/chat/admin/messages", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  const parsed = SendAdminChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "لا يمكن إرسال رسالة فارغة" });
    return;
  }
  const content = parsed.data.content.trim();
  if (!content) {
    res.status(400).json({ error: "لا يمكن إرسال رسالة فارغة" });
    return;
  }

  const staff = isStaff(req.user!.role);
  let conversationUserId: number;

  if (staff) {
    if (!Number.isInteger(parsed.data.recipientId)) {
      res.status(400).json({ error: "الرجاء تحديد العضو المستلم" });
      return;
    }
    conversationUserId = parsed.data.recipientId!;
    const [recipient] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, conversationUserId))
      .limit(1);
    if (!recipient) {
      res.status(404).json({ error: "العضو غير موجود" });
      return;
    }
    if (isStaff(recipient.role)) {
      res.status(400).json({ error: "لا يمكن بدء محادثة إدارية مع عضو في فريق الإدارة" });
      return;
    }
  } else {
    conversationUserId = req.user!.userId;
  }

  try {
    const [created] = await db
      .insert(adminDirectChatMessagesTable)
      .values({ conversationUserId, senderId: req.user!.userId, content })
      .returning();

    const [sender] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);

    res.status(201).json(
      formatMessage(
        {
          id: created.id,
          content: created.content,
          isDeleted: created.isDeleted,
          editedAt: created.editedAt,
          createdAt: created.createdAt,
          senderId: created.senderId,
          senderName: sender.fullName,
          senderRole: sender.role,
          senderAvatarUrl: sender.avatarUrl,
        },
        req.user!,
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Send admin message error");
    res.status(500).json({ error: "تعذر إرسال الرسالة" });
  }
});

router.patch("/chat/admin/messages/:id", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الرسالة غير صحيح" });
    return;
  }
  const parsed = EditAdminChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "لا يمكن إرسال رسالة فارغة" });
    return;
  }
  const content = parsed.data.content.trim();
  if (!content) {
    res.status(400).json({ error: "لا يمكن إرسال رسالة فارغة" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(adminDirectChatMessagesTable)
      .where(eq(adminDirectChatMessagesTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "الرسالة غير موجودة" });
      return;
    }
    if (existing.isDeleted) {
      res.status(400).json({ error: "لا يمكن تعديل رسالة محذوفة" });
      return;
    }
    if (existing.senderId !== req.user!.userId) {
      res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
      return;
    }

    const [updated] = await db
      .update(adminDirectChatMessagesTable)
      .set({ content, editedAt: new Date() })
      .where(eq(adminDirectChatMessagesTable.id, id))
      .returning();

    const [sender] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, updated.senderId))
      .limit(1);

    res.json(
      formatMessage(
        {
          id: updated.id,
          content: updated.content,
          isDeleted: updated.isDeleted,
          editedAt: updated.editedAt,
          createdAt: updated.createdAt,
          senderId: updated.senderId,
          senderName: sender.fullName,
          senderRole: sender.role,
          senderAvatarUrl: sender.avatarUrl,
        },
        req.user!,
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Edit admin message error");
    res.status(500).json({ error: "تعذر تعديل الرسالة" });
  }
});

router.delete("/chat/admin/messages/:id", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "معرّف الرسالة غير صحيح" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(adminDirectChatMessagesTable)
      .where(eq(adminDirectChatMessagesTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "الرسالة غير موجودة" });
      return;
    }

    const owns = existing.senderId === req.user!.userId;
    if (!owns && !isStaff(req.user!.role)) {
      res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
      return;
    }

    const [updated] = await db
      .update(adminDirectChatMessagesTable)
      .set({ isDeleted: true })
      .where(eq(adminDirectChatMessagesTable.id, id))
      .returning();

    const [sender] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, updated.senderId))
      .limit(1);

    res.json(
      formatMessage(
        {
          id: updated.id,
          content: updated.content,
          isDeleted: updated.isDeleted,
          editedAt: updated.editedAt,
          createdAt: updated.createdAt,
          senderId: updated.senderId,
          senderName: sender.fullName,
          senderRole: sender.role,
          senderAvatarUrl: sender.avatarUrl,
        },
        req.user!,
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Delete admin message error");
    res.status(500).json({ error: "تعذر حذف الرسالة" });
  }
});

// ---------------------------------------------------------------------------
// Chat presence (polling-based online indicator)
// ---------------------------------------------------------------------------

const PRESENCE_WINDOW_MS = 60_000;
const PRESENCE_ROOM_TYPES = ["PUBLIC_CHAT", "ADMIN_DIRECT_CHAT"];

// Validates that the caller is allowed to be present in / read the given room.
// Returns null when allowed, otherwise an {status, error} to send back.
function checkRoomAccess(
  user: { userId: number; role: string },
  roomType: string,
  roomKey: string,
): { status: number; error: string } | null {
  if (!PRESENCE_ROOM_TYPES.includes(roomType)) {
    return { status: 400, error: "نوع الغرفة غير صالح" };
  }
  if (roomType === "PUBLIC_CHAT") {
    if (roomKey !== "PUBLIC") return { status: 400, error: "مفتاح الغرفة غير صالح" };
    return null;
  }
  // ADMIN_DIRECT_CHAT: roomKey is the owning member's id.
  const conversationUserId = Number(roomKey);
  if (!Number.isInteger(conversationUserId) || conversationUserId <= 0) {
    return { status: 400, error: "مفتاح الغرفة غير صالح" };
  }
  // Members may only be present in their own conversation; staff may view any.
  if (!isStaff(user.role) && conversationUserId !== user.userId) {
    return { status: 403, error: "ليس لديك صلاحية لهذا الإجراء" };
  }
  return null;
}

async function getActiveRoomUsers(roomType: string, roomKey: string) {
  const cutoff = new Date(Date.now() - PRESENCE_WINDOW_MS);
  const rows = await db
    .select({
      id: usersTable.id,
      fullName: usersTable.fullName,
      account: usersTable.account,
      role: usersTable.role,
      lastSeenAt: chatPresenceTable.lastSeenAt,
    })
    .from(chatPresenceTable)
    .innerJoin(usersTable, eq(chatPresenceTable.userId, usersTable.id))
    .where(
      and(
        eq(chatPresenceTable.roomType, roomType),
        eq(chatPresenceTable.roomKey, roomKey),
        gte(chatPresenceTable.lastSeenAt, cutoff),
      ),
    )
    .orderBy(asc(usersTable.fullName));

  const users = rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    account: r.account,
    role: r.role,
    lastSeenAt: r.lastSeenAt.toISOString(),
  }));
  return { count: users.length, users };
}

// Heartbeat presence + return currently active users
router.post("/chat/presence", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  const parsed = UpdateChatPresenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صالحة" });
    return;
  }
  const { roomType, roomKey } = parsed.data;

  const accessError = checkRoomAccess(req.user!, roomType, roomKey);
  if (accessError) {
    res.status(accessError.status).json({ error: accessError.error });
    return;
  }

  try {
    await db
      .insert(chatPresenceTable)
      .values({ userId: req.user!.userId, roomType, roomKey, lastSeenAt: new Date() })
      .onConflictDoUpdate({
        target: [chatPresenceTable.userId, chatPresenceTable.roomType, chatPresenceTable.roomKey],
        set: { lastSeenAt: new Date() },
      });

    res.json(await getActiveRoomUsers(roomType, roomKey));
  } catch (err) {
    req.log.error({ err }, "Update chat presence error");
    res.status(500).json({ error: "تعذر تحديث الحضور" });
  }
});

// Read currently active users in a room
router.get("/chat/presence", requireAuth, requireFullApp, async (req, res): Promise<void> => {
  const roomType = typeof req.query.roomType === "string" ? req.query.roomType : "";
  const roomKey = typeof req.query.roomKey === "string" ? req.query.roomKey : "";
  if (!roomType || !roomKey) {
    res.status(400).json({ error: "بيانات غير صالحة" });
    return;
  }

  const accessError = checkRoomAccess(req.user!, roomType, roomKey);
  if (accessError) {
    res.status(accessError.status).json({ error: accessError.error });
    return;
  }

  try {
    res.json(await getActiveRoomUsers(roomType, roomKey));
  } catch (err) {
    req.log.error({ err }, "Get chat presence error");
    res.status(500).json({ error: "تعذر تحميل الحضور" });
  }
});

export default router;
