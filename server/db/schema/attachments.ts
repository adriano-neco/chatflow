import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { messagesTable } from "./messages";

export const attachmentsTable = pgTable("attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messagesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  size: integer("size").notNull().default(0),
  mimeType: text("mime_type"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Attachment = typeof attachmentsTable.$inferSelect;
