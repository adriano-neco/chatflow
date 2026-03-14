import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";
import { usersTable } from "./users";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("open"),
  channel: text("channel").notNull().default("chat"),
  priority: text("priority").default("none"),
  subject: text("subject"),
  unreadCount: integer("unread_count").notNull().default(0),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  assigneeId: integer("assignee_id").references(() => usersTable.id, { onDelete: "set null" }),
  labels: text("labels").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type ConversationRow = typeof conversationsTable.$inferSelect;
