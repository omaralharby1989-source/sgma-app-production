import { Router } from "express";
import {
  db,
  usersTable,
  publicChatMessagesTable,
  adminDirectChatMessagesTable,
} from "@workspace/db";
import { eq, desc, asc, sql } from "drizzle-orm";
import {
  SendPublicChatMessageBody,
  EditPublicChatMessageBody,
  SendAdminChatMessageBody,
  EditAdminChatMessageBody,
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

export default router;
