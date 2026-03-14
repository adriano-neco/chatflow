import { Router } from "express";
import { db, contactsTable, conversationsTable, usersTable, messagesTable } from "@workspace/db";
import { eq, like, or, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function formatContact(c: any) {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    company: c.company ?? null,
    location: c.location ?? null,
    avatarUrl: c.avatarUrl ?? null,
    conversationsCount: c.conversationsCount,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;

    let query = db.select().from(contactsTable).orderBy(desc(contactsTable.createdAt));

    let contacts;
    let total;
    if (search) {
      const searchTerm = `%${search}%`;
      contacts = await db
        .select()
        .from(contactsTable)
        .where(or(
          like(contactsTable.name, searchTerm),
          like(sql`coalesce(${contactsTable.email}, '')`, searchTerm),
          like(sql`coalesce(${contactsTable.company}, '')`, searchTerm),
        ))
        .orderBy(desc(contactsTable.createdAt))
        .limit(limit)
        .offset(offset);
      total = contacts.length;
    } else {
      contacts = await db.select().from(contactsTable).orderBy(desc(contactsTable.createdAt)).limit(limit).offset(offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(contactsTable);
      total = Number(count);
    }

    res.json({ contacts: contacts.map(formatContact), total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, email, phone, company, location } = req.body;
    if (!name) {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }
    const [contact] = await db.insert(contactsTable).values({ name, email, phone, company, location }).returning();
    res.status(201).json(formatContact(contact));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, id)).limit(1);
    if (!contact) {
      res.status(404).json({ error: "Contato não encontrado" });
      return;
    }
    res.json(formatContact(contact));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, phone, company, location } = req.body;
    if (!name) {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }
    const [contact] = await db
      .update(contactsTable)
      .set({ name, email, phone, company, location })
      .where(eq(contactsTable.id, id))
      .returning();
    if (!contact) {
      res.status(404).json({ error: "Contato não encontrado" });
      return;
    }
    res.json(formatContact(contact));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(contactsTable).where(eq(contactsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/conversations", requireAuth, async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const conversations = await db.select().from(conversationsTable)
      .where(eq(conversationsTable.contactId, contactId))
      .orderBy(desc(conversationsTable.updatedAt));

    const contactRows = await db.select().from(contactsTable).where(eq(contactsTable.id, contactId)).limit(1);
    const contact = contactRows[0];

    const result = await Promise.all(conversations.map(async (conv) => {
      let assignee = null;
      if (conv.assigneeId) {
        const [u] = await db.select().from(usersTable).where(eq(usersTable.id, conv.assigneeId)).limit(1);
        if (u) assignee = { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl ?? null, createdAt: u.createdAt.toISOString() };
      }
      const [lastMsg] = await db.select().from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

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
        } : null,
        assignee,
        lastMessage: lastMsg ? {
          id: lastMsg.id, conversationId: lastMsg.conversationId, content: lastMsg.content,
          messageType: lastMsg.messageType, sender: null, createdAt: lastMsg.createdAt.toISOString()
        } : null,
        labels: conv.labels ?? [],
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
      };
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
