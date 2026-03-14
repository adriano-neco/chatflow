import { Router } from "express";
import { db, messagesTable, conversationsTable, usersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { io } from "../app";

const router = Router({ mergeParams: true });

function formatMessage(msg: any, sender: any) {
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    content: msg.content,
    messageType: msg.messageType,
    deliveryStatus: msg.deliveryStatus ?? "sent",
    sender,
    createdAt: msg.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const messages = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(asc(messagesTable.createdAt));

    const result = await Promise.all(messages.map(async (msg) => {
      let sender = null;
      if (msg.senderId) {
        const [u] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId)).limit(1);
        if (u) sender = { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl ?? null, createdAt: u.createdAt.toISOString() };
      }
      return formatMessage(msg, sender);
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { content, messageType } = req.body;
    const currentUser = (req as any).user;

    if (!content || !messageType) {
      res.status(400).json({ error: "Conteúdo e tipo são obrigatórios" });
      return;
    }

    const senderId = messageType === "outgoing" ? currentUser.id : null;

    const [msg] = await db.insert(messagesTable)
      .values({ conversationId, content, messageType, deliveryStatus: "sent", senderId })
      .returning();

    await db.update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationsTable.id, conversationId));

    let sender = null;
    if (senderId) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, senderId)).limit(1);
      if (u) sender = { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl ?? null, createdAt: u.createdAt.toISOString() };
    }

    const result = formatMessage(msg, sender);
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
    res.json(formatMessage(msg, null));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
