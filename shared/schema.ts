import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const STORES = ["JP23", "KP5", "TS17"] as const;
export type StoreName = typeof STORES[number];

export const SHIFT_TYPES = ["Mittag", "Abend"] as const;
export type ShiftType = typeof SHIFT_TYPES[number];

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  employeeName: text("employee_name").notNull(),
  storeName: text("store_name").notNull().default("JP23"),
  shiftType: text("shift_type").notNull().default("Mittag"),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  status: text("status").notNull().default("open"),

  startBills100: integer("start_bills_100").notNull().default(0),
  startBills50: integer("start_bills_50").notNull().default(0),
  startBills20: integer("start_bills_20").notNull().default(0),
  startBills10: integer("start_bills_10").notNull().default(0),
  startBills5: integer("start_bills_5").notNull().default(0),
  startCoins2: integer("start_coins_2").notNull().default(0),
  startCoins1: integer("start_coins_1").notNull().default(0),
  startCents50: integer("start_cents_50").notNull().default(0),
  startCents20: integer("start_cents_20").notNull().default(0),
  startCents10: integer("start_cents_10").notNull().default(0),
  startTotal: numeric("start_total", { precision: 10, scale: 2 }).notNull().default("0"),

  endBills100: integer("end_bills_100"),
  endBills50: integer("end_bills_50"),
  endBills20: integer("end_bills_20"),
  endBills10: integer("end_bills_10"),
  endBills5: integer("end_bills_5"),
  endCoins2: integer("end_coins_2"),
  endCoins1: integer("end_coins_1"),
  endCents50: integer("end_cents_50"),
  endCents20: integer("end_cents_20"),
  endCents10: integer("end_cents_10"),
  endTotal: numeric("end_total", { precision: 10, scale: 2 }),

  cashRevenue: numeric("cash_revenue", { precision: 10, scale: 2 }),
  cashWithdrawal: numeric("cash_withdrawal", { precision: 10, scale: 2 }),
});

export const insertShiftStartSchema = createInsertSchema(shifts).pick({
  employeeName: true,
  storeName: true,
  shiftType: true,
  startBills100: true,
  startBills50: true,
  startBills20: true,
  startBills10: true,
  startBills5: true,
  startCoins2: true,
  startCoins1: true,
  startCents50: true,
  startCents20: true,
  startCents10: true,
  startTotal: true,
}).extend({
  storeName: z.enum(STORES),
  shiftType: z.enum(SHIFT_TYPES),
});

export const endShiftSchema = z.object({
  endBills100: z.number().int().min(0).default(0),
  endBills50: z.number().int().min(0).default(0),
  endBills20: z.number().int().min(0).default(0),
  endBills10: z.number().int().min(0).default(0),
  endBills5: z.number().int().min(0).default(0),
  endCoins2: z.number().int().min(0).default(0),
  endCoins1: z.number().int().min(0).default(0),
  endCents50: z.number().int().min(0).default(0),
  endCents20: z.number().int().min(0).default(0),
  endCents10: z.number().int().min(0).default(0),
  endTotal: z.string(),
  cashRevenue: z.string(),
  cashWithdrawal: z.string(),
});

export type InsertShiftStart = z.infer<typeof insertShiftStartSchema>;
export type EndShift = z.infer<typeof endShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

export const DENOMINATIONS = [
  { key: "bills100", label: "100 € Scheine", value: 100 },
  { key: "bills50", label: "50 € Scheine", value: 50 },
  { key: "bills20", label: "20 € Scheine", value: 20 },
  { key: "bills10", label: "10 € Scheine", value: 10 },
  { key: "bills5", label: "5 € Scheine", value: 5 },
  { key: "coins2", label: "2 € Münzen", value: 2 },
  { key: "coins1", label: "1 € Münzen", value: 1 },
  { key: "cents50", label: "50 Cent", value: 0.5 },
  { key: "cents20", label: "20 Cent", value: 0.2 },
  { key: "cents10", label: "10 Cent", value: 0.1 },
] as const;

export type DenominationKey = typeof DENOMINATIONS[number]["key"];

export function calculateTotal(counts: Record<string, number>): number {
  let total = 0;
  for (const denom of DENOMINATIONS) {
    const count = counts[denom.key] || 0;
    total += count * denom.value;
  }
  return Math.round(total * 100) / 100;
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
