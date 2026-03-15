import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const wppInstancesTable = pgTable("wpp_instances", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sessionName: text("session_name").notNull().unique(),
  baseUrl: text("base_url").notNull(),
  secretKey: text("secret_key").notNull(),
  token: text("token"),
  status: text("status").notNull().default("disconnected"),
  qrCode: text("qr_code"),
  connectedPhone: text("connected_phone"),
  webhookUrl: text("webhook_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WppInstance = typeof wppInstancesTable.$inferSelect;
