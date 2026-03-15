import { Router } from "express";
import { db, contactsTable, conversationsTable, usersTable, messagesTable } from "../db/index.js";
import { eq, like, or, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

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
    logger.error("Internal error", { error: String(err) });
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
    logger.error("Internal error", { error: String(err) });
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
    logger.error("Internal error", { error: String(err) });
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
    logger.error("Internal error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(contactsTable).where(eq(contactsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    logger.error("Internal error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/conversations", requireAuth, async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const convs = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.contactId, contactId))
      .orderBy(desc(conversationsTable.updatedAt));
    res.json(convs.map((c) => ({
      id: c.id,
      status: c.status,
      channel: c.channel,
      priority: c.priority ?? null,
      subject: c.subject ?? null,
      unreadCount: c.unreadCount,
      labels: c.labels ?? [],
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })));
  } catch (err) {
    logger.error("Internal error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
