import { Router } from "express";
import { db, conversationsTable, contactsTable, usersTable, messagesTable } from "../db/index.js";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { io } from "../app.js";

const router = Router();

async function buildConversation(conv: any) {
  const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, conv.contactId)).limit(1);
  let assignee = null;
  if (conv.assigneeId) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, conv.assigneeId)).limit(1);
    if (u) assignee = { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl ?? null, createdAt: u.createdAt.toISOString() };
  }
  const [lastMsg] = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, conv.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(1);

  let lastMessage = null;
  if (lastMsg) {
    let sender = null;
    if (lastMsg.senderId) {
      const [s] = await db.select().from(usersTable).where(eq(usersTable.id, lastMsg.senderId)).limit(1);
      if (s) sender = { id: s.id, name: s.name, email: s.email, role: s.role, avatarUrl: s.avatarUrl ?? null, createdAt: s.createdAt.toISOString() };
    }
    lastMessage = {
      id: lastMsg.id,
      conversationId: lastMsg.conversationId,
      content: lastMsg.content,
      messageType: lastMsg.messageType,
      sender,
      createdAt: lastMsg.createdAt.toISOString(),
    };
  }

  return {
    id: conv.id,
    status: conv.status,
    channel: conv.channel,
    priority: conv.priority ?? null,
    subject: conv.subject ?? null,
    unreadCount: conv.unreadCount,
    contact: contact ? {
      id: contact.id, name: contact.name, email: contact.email ?? null,
      phone: contact.phone ?? null, company: contact.company ?? null,
      location: contact.location ?? null, avatarUrl: contact.avatarUrl ?? null,
      conversationsCount: contact.conversationsCount, createdAt: contact.createdAt.toISOString()
    } : { id: 0, name: "Desconhecido", email: null, phone: null, company: null, location: null, avatarUrl: null, conversationsCount: 0, createdAt: conv.createdAt.toISOString() },
    assignee,
    lastMessage,
    labels: conv.labels ?? [],
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, assigneeId } = req.query;
    let rows = await db.select().from(conversationsTable).orderBy(desc(conversationsTable.updatedAt));
    if (status) rows = rows.filter((c) => c.status === status);
    if (assigneeId) rows = rows.filter((c) => c.assigneeId === parseInt(assigneeId as string));
    const result = await Promise.all(rows.map(buildConversation));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { contactId, channel, subject, assigneeId } = req.body;
    if (!contactId || !channel) {
      res.status(400).json({ error: "contactId e channel são obrigatórios" });
      return;
    }
    const [conv] = await db.insert(conversationsTable)
      .values({ contactId, channel, subject, assigneeId: assigneeId ?? null, status: "open" })
      .returning();
    await db.update(contactsTable)
      .set({ conversationsCount: sql`${contactsTable.conversationsCount} + 1` })
      .where(eq(contactsTable.id, contactId));
    const result = await buildConversation(conv);
    io.emit("conversation:created", result);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id)).limit(1);
    if (!conv) {
      res.status(404).json({ error: "Conversa não encontrada" });
      return;
    }
    res.json(await buildConversation(conv));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, assigneeId, priority, labels } = req.body;
    const [conv] = await db.update(conversationsTable)
      .set({
        ...(status !== undefined ? { status } : {}),
        ...(assigneeId !== undefined ? { assigneeId } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(labels !== undefined ? { labels } : {}),
        updatedAt: new Date(),
      })
      .where(eq(conversationsTable.id, id))
      .returning();
    if (!conv) {
      res.status(404).json({ error: "Conversa não encontrada" });
      return;
    }
    const result = await buildConversation(conv);
    io.emit("conversation:updated", result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(conversationsTable).where(eq(conversationsTable.id, id));
    io.emit("conversation:deleted", { id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
