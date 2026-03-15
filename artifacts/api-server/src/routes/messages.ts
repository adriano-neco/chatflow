import { Router } from "express";
import { db, messagesTable, conversationsTable, usersTable, attachmentsTable, messageReactionsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { io } from "../app";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

const router = Router({ mergeParams: true });

async function formatMessage(msg: any) {
  let sender = null;
  if (msg.senderId) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId)).limit(1);
    if (u) sender = { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl ?? null, createdAt: u.createdAt.toISOString() };
  }

  const attachments = await db.select().from(attachmentsTable)
    .where(eq(attachmentsTable.messageId, msg.id))
    .orderBy(asc(attachmentsTable.createdAt));

  const reactions = await db.select().from(messageReactionsTable)
    .where(eq(messageReactionsTable.messageId, msg.id));

  let replyTo = null;
  if (msg.replyToId) {
    const [parent] = await db.select().from(messagesTable).where(eq(messagesTable.id, msg.replyToId)).limit(1);
    if (parent) {
      const parentAtts = await db.select().from(attachmentsTable).where(eq(attachmentsTable.messageId, parent.id)).limit(1);
      replyTo = {
        id: parent.id,
        content: parent.content,
        messageType: parent.messageType,
        createdAt: parent.createdAt.toISOString(),
        hasAttachment: parentAtts.length > 0,
        attachmentType: parentAtts[0]?.type,
      };
    }
  }

  return {
    id: msg.id,
    conversationId: msg.conversationId,
    content: msg.content,
    messageType: msg.messageType,
    deliveryStatus: msg.deliveryStatus ?? "sent",
    isForwarded: msg.isForwarded ?? false,
    replyTo,
    sender,
    attachments: attachments.map(a => ({ ...a, metadata: a.metadata, createdAt: a.createdAt.toISOString() })),
    reactions,
    createdAt: msg.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const messages = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(asc(messagesTable.createdAt));

    const result = await Promise.all(messages.map(formatMessage));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const currentUser = (req as any).user;

    let content: string;
    let replyToId: number | undefined;
    let isForwarded: boolean = false;
    let attachmentData: { type: string; name: string; size: number; mimeType: string; metadata?: any } | null = null;

    if (req.file) {
      const body = req.body;
      content = body.content || req.file.originalname;
      replyToId = body.replyToId ? parseInt(body.replyToId) : undefined;
      isForwarded = body.isForwarded === 'true';
      const rawMeta = body.metadata;
      let metadata: any = undefined;
      if (rawMeta) {
        try { metadata = JSON.parse(rawMeta); } catch {}
      }
      attachmentData = {
        type: body.attachmentType || 'document',
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        metadata,
      };
    } else {
      const body = req.body;
      content = body.content;
      replyToId = body.replyToId ? parseInt(body.replyToId) : undefined;
      isForwarded = body.isForwarded === true;
    }

    const messageType = req.body?.messageType || 'outgoing';

    if (!content) {
      res.status(400).json({ error: "Conteúdo é obrigatório" });
      return;
    }

    const senderId = messageType === "outgoing" ? currentUser.id : null;

    const [msg] = await db.insert(messagesTable)
      .values({
        conversationId,
        content,
        messageType,
        deliveryStatus: "sent",
        senderId,
        replyToId,
        isForwarded,
      })
      .returning();

    if (attachmentData && req.file) {
      const url = `/api/uploads/${req.file.filename}`;
      await db.insert(attachmentsTable).values({
        messageId: msg.id,
        type: attachmentData.type,
        url,
        name: attachmentData.name,
        size: attachmentData.size,
        mimeType: attachmentData.mimeType,
        metadata: attachmentData.metadata ?? null,
      });
    }

    await db.update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationsTable.id, conversationId));

    const result = await formatMessage(msg);
    io.to(`conversation:${conversationId}`).emit("message:new", result);

    setTimeout(async () => {
      await db.update(messagesTable).set({ deliveryStatus: "delivered" }).where(eq(messagesTable.id, msg.id));
      io.to(`conversation:${conversationId}`).emit("message:status", { id: msg.id, deliveryStatus: "delivered" });
    }, 1000);

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:msgId/status", requireAuth, async (req, res) => {
  try {
    const { msgId } = req.params;
    const { deliveryStatus } = req.body;
    if (!["sent", "delivered", "read"].includes(deliveryStatus)) {
      res.status(400).json({ error: "Status inválido" });
      return;
    }
    const [msg] = await db.update(messagesTable)
      .set({ deliveryStatus })
      .where(eq(messagesTable.id, parseInt(msgId)))
      .returning();

    const conversationId = msg.conversationId;
    io.to(`conversation:${conversationId}`).emit("message:status", { id: msg.id, deliveryStatus });
    res.json(await formatMessage(msg));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:msgId/react", requireAuth, async (req, res) => {
  try {
    const msgId = parseInt(req.params.msgId);
    const { emoji } = req.body;
    const user = (req as any).user;

    if (!emoji) { res.status(400).json({ error: "Emoji é obrigatório" }); return; }

    const existing = await db.select().from(messageReactionsTable)
      .where(eq(messageReactionsTable.messageId, msgId))
      .then(rows => rows.filter(r => r.userId === user.id && r.emoji === emoji));

    if (existing.length > 0) {
      await db.delete(messageReactionsTable)
        .where(eq(messageReactionsTable.id, existing[0].id));
    } else {
      await db.insert(messageReactionsTable).values({ messageId: msgId, userId: user.id, emoji });
    }

    const reactions = await db.select().from(messageReactionsTable)
      .where(eq(messageReactionsTable.messageId, msgId));

    const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
    if (msg) {
      io.to(`conversation:${msg.conversationId}`).emit("message:reaction", { messageId: msgId, reactions });
    }

    res.json({ reactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/forward", requireAuth, async (req, res) => {
  try {
    const { messageId, conversationIds } = req.body;
    const user = (req as any).user;

    if (!messageId || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      res.status(400).json({ error: "messageId e conversationIds são obrigatórios" }); return;
    }

    const [original] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId)).limit(1);
    if (!original) { res.status(404).json({ error: "Mensagem não encontrada" }); return; }

    const originalAttachments = await db.select().from(attachmentsTable)
      .where(eq(attachmentsTable.messageId, messageId))
      .orderBy(asc(attachmentsTable.createdAt));

    const results = [];
    for (const convId of conversationIds) {
      const [fwd] = await db.insert(messagesTable).values({
        conversationId: convId,
        content: original.content,
        messageType: "outgoing",
        deliveryStatus: "sent",
        senderId: user.id,
        isForwarded: true,
      }).returning();

      for (const att of originalAttachments) {
        await db.insert(attachmentsTable).values({
          messageId: fwd.id,
          type: att.type,
          url: att.url,
          name: att.name,
          size: att.size,
          mimeType: att.mimeType,
          metadata: att.metadata,
        });
      }

      await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, convId));
      const result = await formatMessage(fwd);
      io.to(`conversation:${convId}`).emit("message:new", result);
      results.push(result);
    }

    res.status(201).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
