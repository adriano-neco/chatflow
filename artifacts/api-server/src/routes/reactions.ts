import { Router } from "express";
import { db, messageReactionsTable, messagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { io } from "../app";

const router = Router({ mergeParams: true });

router.post("/:msgId/react", requireAuth, async (req, res) => {
  try {
    const msgId = parseInt(req.params.msgId);
    const { emoji } = req.body;
    const user = (req as any).user;

    if (!emoji) {
      res.status(400).json({ error: "Emoji é obrigatório" });
      return;
    }

    const existing = await db.select().from(messageReactionsTable)
      .where(and(eq(messageReactionsTable.messageId, msgId), eq(messageReactionsTable.userId, user.id), eq(messageReactionsTable.emoji, emoji)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(messageReactionsTable)
        .where(and(eq(messageReactionsTable.messageId, msgId), eq(messageReactionsTable.userId, user.id), eq(messageReactionsTable.emoji, emoji)));
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

export default router;
