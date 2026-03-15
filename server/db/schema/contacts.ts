import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  location: text("location"),
  avatarUrl: text("avatar_url"),
  conversationsCount: integer("conversations_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Contact = typeof contactsTable.$inferSelect;
