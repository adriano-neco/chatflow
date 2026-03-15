import { Router } from "express";
import { db, messagesTable, conversationsTable, attachmentsTable, usersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { io } from "../app";

const router = Router();

router.post("/messages/forward", requireAuth, async (req, res) => {
  try {
    const { messageId, conversationIds } = req.body;
    const user = (req as any).user;

    if (!messageId || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      res.status(400).json({ error: "messageId e conversationIds são obrigatórios" });
      return;
    }

    const [original] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId)).limit(1);
    if (!original) {
      res.status(404).json({ error: "Mensagem não encontrada" });
      return;
    }

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

      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
      const sender = u ? { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl ?? null, createdAt: u.createdAt.toISOString() } : null;

      const result = {
        id: fwd.id,
        conversationId: fwd.conversationId,
        content: fwd.content,
        messageType: fwd.messageType,
        deliveryStatus: fwd.deliveryStatus,
        sender,
        isForwarded: fwd.isForwarded,
        createdAt: fwd.createdAt.toISOString(),
        attachments: originalAttachments.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
        reactions: [],
      };

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
