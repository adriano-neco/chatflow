import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { conversationsTable } from "./conversations";
import { usersTable } from "./users";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("incoming"),
  deliveryStatus: text("delivery_status").notNull().default("sent"),
  senderId: integer("sender_id").references(() => usersTable.id, { onDelete: "set null" }),
  replyToId: integer("reply_to_id"),
  isForwarded: boolean("is_forwarded").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
