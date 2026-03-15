import { Router } from "express";
import { db, wppInstancesTable, contactsTable, conversationsTable, messagesTable, attachmentsTable } from "../db/index.js";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { io } from "../app.js";
import { logger } from "../lib/logger.js";
import {
  generateToken,
  startSession,
  getQrCode,
  getSessionStatus,
  closeSession,
} from "../lib/wppconnect.js";

const router = Router();

/* ── List all instances ──────────────────────────────── */
router.get("/", requireAuth, async (_req, res) => {
  try {
    const rows = await db.select().from(wppInstancesTable).orderBy(wppInstancesTable.createdAt);
    res.json(rows.map(r => ({ ...r, secretKey: undefined, token: undefined })));
  } catch (err) {
    logger.error("Internal error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Get one instance ────────────────────────────────── */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(wppInstancesTable).where(eq(wppInstancesTable.id, id)).limit(1);
    if (!row) { res.status(404).json({ error: "Instância não encontrada" }); return; }
    res.json({ ...row, secretKey: undefined, token: undefined });
  } catch (err) {
    logger.error("Internal error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Create instance ─────────────────────────────────── */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, sessionName, baseUrl, secretKey } = req.body;
    if (!name || !sessionName || !baseUrl || !secretKey) {
      res.status(400).json({ error: "Campos obrigatórios: name, sessionName, baseUrl, secretKey" });
      return;
    }
    const clean = sessionName.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const [row] = await db.insert(wppInstancesTable).values({
      name,
      sessionName: clean,
      baseUrl: baseUrl.replace(/\/$/, ""),
      secretKey,
      status: "disconnected",
    }).returning();
    res.status(201).json({ ...row, secretKey: undefined, token: undefined });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Nome de sessão já existe" });
      return;
    }
    logger.error("Internal error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Update instance ─────────────────────────────────── */
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, baseUrl, secretKey } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (baseUrl) updates.baseUrl = baseUrl.replace(/\/$/, "");
    if (secretKey) updates.secretKey = secretKey;
    const [row] = await db.update(wppInstancesTable).set(updates).where(eq(wppInstancesTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Instância não encontrada" }); return; }
    res.json({ ...row, secretKey: undefined, token: undefined });
  } catch (err) {
    logger.error("Internal error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Delete instance ─────────────────────────────────── */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(wppInstancesTable).where(eq(wppInstancesTable.id, id)).limit(1);
    if (!row) { res.status(404).json({ error: "Instância não encontrada" }); return; }
    if (row.token && row.status === "connected") {
      await closeSession(row, row.token).catch(() => {});
    }
    await db.delete(wppInstancesTable).where(eq(wppInstancesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    logger.error("Internal error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Connect: generate token + start session ─────────── */
router.post("/:id/connect", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(wppInstancesTable).where(eq(wppInstancesTable.id, id)).limit(1);
    if (!row) { res.status(404).json({ error: "Instância não encontrada" }); return; }

    await db.update(wppInstancesTable).set({ status: "connecting", qrCode: null, updatedAt: new Date() }).where(eq(wppInstancesTable.id, id));

    const token = await generateToken(row);
    if (!token) {
      await db.update(wppInstancesTable).set({ status: "error", updatedAt: new Date() }).where(eq(wppInstancesTable.id, id));
      res.status(502).json({ error: "Não foi possível gerar o token. Verifique a URL e a chave secreta." });
      return;
    }

    const webhookBase = process.env.WEBHOOK_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const webhookUrl = `${webhookBase}/api/instances/${id}/webhook`;

    await startSession(row, token, webhookUrl);

    await db.update(wppInstancesTable).set({ token, status: "qr_pending", webhookUrl, updatedAt: new Date() }).where(eq(wppInstancesTable.id, id));

    const qrCode = await getQrCode(row, token);
    if (qrCode) {
      await db.update(wppInstancesTable).set({ qrCode, updatedAt: new Date() }).where(eq(wppInstancesTable.id, id));
    }

    io.emit("instance:updated", { id, status: "qr_pending", qrCode });

    res.json({ ok: true, status: "qr_pending", qrCode });
  } catch (err) {
    logger.error("Internal error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Disconnect ──────────────────────────────────────── */
router.post("/:id/disconnect", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(wppInstancesTable).where(eq(wppInstancesTable.id, id)).limit(1);
    if (!row) { res.status(404).json({ error: "Instância não encontrada" }); return; }
    if (row.token) await closeSession(row, row.token).catch(() => {});
    await db.update(wppInstancesTable).set({ status: "disconnected", qrCode: null, connectedPhone: null, token: null, updatedAt: new Date() }).where(eq(wppInstancesTable.id, id));
    io.emit("instance:updated", { id, status: "disconnected" });
    res.json({ ok: true });
  } catch (err) {
    logger.error("Internal error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Poll QR / status ────────────────────────────────── */
router.get("/:id/qr", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(wppInstancesTable).where(eq(wppInstancesTable.id, id)).limit(1);
    if (!row) { res.status(404).json({ error: "Instância não encontrada" }); return; }
    if (!row.token) { res.json({ status: row.status, qrCode: null }); return; }

    const remoteStatus = await getSessionStatus(row, row.token);

    if (remoteStatus === "connected") {
      await db.update(wppInstancesTable).set({ status: "connected", qrCode: null, updatedAt: new Date() }).where(eq(wppInstancesTable.id, id));
      io.emit("instance:updated", { id, status: "connected" });
      res.json({ status: "connected", qrCode: null });
      return;
    }

    const qrCode = await getQrCode(row, row.token);
    if (qrCode) {
      await db.update(wppInstancesTable).set({ qrCode, status: "qr_pending", updatedAt: new Date() }).where(eq(wppInstancesTable.id, id));
      io.emit("instance:updated", { id, status: "qr_pending", qrCode });
    }

    res.json({ status: row.status, qrCode: qrCode ?? row.qrCode });
  } catch (err) {
    logger.error("Internal error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Webhook: receive messages from WPP-Connect ──────── */
router.post("/:id/webhook", async (req, res) => {
  try {
    const instanceId = parseInt(req.params.id);
    const payload = req.body;

    const [instance] = await db.select().from(wppInstancesTable).where(eq(wppInstancesTable.id, instanceId)).limit(1);
    if (!instance) { res.status(404).json({ error: "Instance not found" }); return; }

    if (payload.event === "qrcode") {
      const qrCode = payload.qrcode ?? payload.data?.qrcode;
      if (qrCode) {
        await db.update(wppInstancesTable).set({ qrCode, status: "qr_pending", updatedAt: new Date() }).where(eq(wppInstancesTable.id, instanceId));
        io.emit("instance:updated", { id: instanceId, status: "qr_pending", qrCode });
      }
      res.json({ ok: true });
      return;
    }

    if (payload.event === "status-find" || payload.event === "session:connected") {
      const isConnected = payload.status === "isLogged" || payload.status === "Connected" || payload.event === "session:connected";
      if (isConnected) {
        const connectedPhone = payload.session ?? payload.data?.pushname ?? null;
        await db.update(wppInstancesTable).set({ status: "connected", qrCode: null, connectedPhone, updatedAt: new Date() }).where(eq(wppInstancesTable.id, instanceId));
        io.emit("instance:updated", { id: instanceId, status: "connected", connectedPhone });
      }
      res.json({ ok: true });
      return;
    }

    if (payload.event === "onmessage" || payload.event === "message") {
      const msg = payload.data ?? payload;

      const from: string = msg.from ?? msg.chatId ?? "";
      const body: string = msg.body ?? msg.content ?? "";
      const msgId: string = msg.id?._serialized ?? msg.id ?? "";
      const isGroup = from.includes("@g.us");

      if (isGroup || from.includes("status@broadcast") || msg.fromMe) {
        res.json({ ok: true });
        return;
      }

      const phone = from.replace(/@c\.us$/, "");
      const senderName: string = msg.sender?.pushname ?? msg.notifyName ?? phone;

      let [contact] = await db.select().from(contactsTable).where(eq(contactsTable.whatsappId, from)).limit(1);
      if (!contact) {
        [contact] = await db.insert(contactsTable).values({
          name: senderName,
          phone,
          whatsappId: from,
        }).returning();
      } else if (contact.name !== senderName && senderName !== phone) {
        [contact] = await db.update(contactsTable).set({ name: senderName }).where(eq(contactsTable.id, contact.id)).returning();
      }

      let conversation = await db.select().from(conversationsTable)
        .where(and(eq(conversationsTable.contactId, contact.id), eq(conversationsTable.instanceId, instanceId)))
        .limit(1)
        .then(r => r[0]);

      if (!conversation) {
        [conversation] = await db.insert(conversationsTable).values({
          contactId: contact.id,
          instanceId,
          channel: "whatsapp",
          status: "open",
          unreadCount: 1,
        }).returning();
        await db.update(contactsTable).set({ conversationsCount: (contact.conversationsCount ?? 0) + 1 }).where(eq(contactsTable.id, contact.id));
      } else {
        await db.update(conversationsTable).set({ unreadCount: (conversation.unreadCount ?? 0) + 1, updatedAt: new Date() }).where(eq(conversationsTable.id, conversation.id));
      }

      const existing = msgId ? await db.select().from(messagesTable).where(eq(messagesTable.whatsappMsgId, msgId)).limit(1).then(r => r[0]) : null;
      if (existing) { res.json({ ok: true }); return; }

      const messageType = msg.type ?? "chat";
      let content = body || "(sem texto)";
      let attachmentData: { type: string; name: string; size: number; mimeType: string; url: string } | null = null;

      if (messageType === "image" || messageType === "video" || messageType === "audio" || messageType === "ptt" || messageType === "document") {
        const mediaUrl = msg.mediaUrl ?? msg.body ?? "";
        const isProxied = mediaUrl.startsWith("http");
        if (isProxied) {
          const attachType = messageType === "ptt" ? "audio" : messageType;
          attachmentData = {
            type: attachType,
            name: msg.filename ?? `${attachType}_${Date.now()}`,
            size: msg.size ?? 0,
            mimeType: msg.mimetype ?? "",
            url: mediaUrl,
          };
          content = msg.caption ?? msg.body ?? `[${attachType}]`;
        }
      }

      const [newMsg] = await db.insert(messagesTable).values({
        conversationId: conversation.id,
        content,
        messageType: "incoming",
        deliveryStatus: "delivered",
        senderId: null,
        whatsappMsgId: msgId || null,
      }).returning();

      if (attachmentData) {
        await db.insert(attachmentsTable).values({
          messageId: newMsg.id,
          type: attachmentData.type,
          url: attachmentData.url,
          name: attachmentData.name,
          size: attachmentData.size,
          mimeType: attachmentData.mimeType,
        });
      }

      io.emit("message:new", { ...newMsg, conversationId: conversation.id, attachments: attachmentData ? [attachmentData] : [], reactions: [], replyTo: null, sender: null });
      io.to(`conversation:${conversation.id}`).emit("message:new", { ...newMsg, attachments: attachmentData ? [attachmentData] : [], reactions: [], replyTo: null, sender: null });
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error("Webhook error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
