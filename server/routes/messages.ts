import { Router } from "express";
import { db, messagesTable, conversationsTable, usersTable, attachmentsTable, messageReactionsTable, wppInstancesTable, contactsTable } from "../db/index.js";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { io } from "../app.js";
import { uploadFile } from "../lib/storage.js";
import { logger } from "../lib/logger.js";
import multer from "multer";
import {
  sendTextMessage,
  sendFileBase64,
  sendImageBase64,
  sendAudioBase64,
} from "../lib/wppconnect.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

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
    logger.error("Failed to fetch messages", { error: String(err) });
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
    let fileBuffer: Buffer | null = null;

    if (req.file) {
      const body = req.body;
      content = body.content || req.file.originalname;
      replyToId = body.replyToId ? parseInt(body.replyToId) : undefined;
      isForwarded = body.isForwarded === "true";
      let metadata: any = undefined;
      if (body.metadata) {
        try { metadata = JSON.parse(body.metadata); } catch {}
      }
      attachmentData = {
        type: body.attachmentType || "document",
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        metadata,
      };
      fileBuffer = req.file.buffer;
    } else {
      const body = req.body;
      content = body.content;
      replyToId = body.replyToId ? parseInt(body.replyToId) : undefined;
      isForwarded = body.isForwarded === true;
    }

    const messageType = req.body?.messageType || "outgoing";

    if (!content) {
      res.status(400).json({ error: "Conteúdo é obrigatório" });
      return;
    }

    const senderId = messageType === "outgoing" ? currentUser.id : null;

    const [msg] = await db.insert(messagesTable)
      .values({ conversationId, content, messageType, deliveryStatus: "sent", senderId, replyToId, isForwarded })
      .returning();

    let fileUrl: string | undefined;

    if (attachmentData && fileBuffer) {
      fileUrl = await uploadFile(fileBuffer, attachmentData.name, attachmentData.mimeType);
      logger.info("Attachment uploaded to MinIO", { name: attachmentData.name, url: fileUrl });

      await db.insert(attachmentsTable).values({
        messageId: msg.id,
        type: attachmentData.type,
        url: fileUrl,
        name: attachmentData.name,
        size: attachmentData.size,
        mimeType: attachmentData.mimeType,
        metadata: attachmentData.metadata ?? null,
      });
    }

    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));

    const result = await formatMessage(msg);
    io.to(`conversation:${conversationId}`).emit("message:new", result);
    res.status(201).json(result);

    if (messageType === "outgoing") {
      const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId)).limit(1);
      if (conv?.channel === "whatsapp" && conv.instanceId) {
        const [instance] = await db.select().from(wppInstancesTable).where(eq(wppInstancesTable.id, conv.instanceId)).limit(1);
        if (instance?.status === "connected" && instance.token) {
          const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, conv.contactId)).limit(1);
          const phone = contact?.whatsappId ?? contact?.phone ?? "";
          if (phone) {
            if (fileBuffer && attachmentData) {
              const base64 = fileBuffer.toString("base64");
              const dataUri = `data:${attachmentData.mimeType};base64,${base64}`;
              const caption = content === attachmentData.name ? "" : content;
              try {
                if (attachmentData.type === "image") {
                  await sendImageBase64(instance, instance.token, phone, dataUri, attachmentData.name, caption);
                } else if (attachmentData.type === "audio") {
                  await sendAudioBase64(instance, instance.token, phone, base64, true);
                } else {
                  await sendFileBase64(instance, instance.token, phone, dataUri, attachmentData.name, caption);
                }
              } catch (e) {
                logger.error("WPP send file failed", { error: String(e) });
              }
            } else {
              await sendTextMessage(instance, instance.token, phone, content)
                .catch(e => logger.error("WPP send text failed", { error: String(e) }));
            }
          }
        }
      }
    }
  } catch (err) {
    logger.error("Failed to send message", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
