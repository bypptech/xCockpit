import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  location: text("location"),
  status: text("status").notNull().default("offline"),
  isOnline: boolean("is_online").default(false).notNull(),
  lastActivity: timestamp("last_activity"),
  metadata: jsonb("metadata"),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  deviceId: varchar("device_id").references(() => devices.id).notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  currency: text("currency").notNull().default("USDC"),
  txHash: text("tx_hash"),
  status: text("status").notNull().default("pending"),
  command: text("command").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  completedAt: timestamp("completed_at"),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  deviceId: varchar("device_id").references(() => devices.id).notNull(),
  paymentId: varchar("payment_id").references(() => payments.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  lastActivity: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type User = typeof users.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Session = typeof sessions.$inferSelect;
