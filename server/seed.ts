import { db } from "./db";
import { shifts } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(shifts);
  if (Number(existing[0].count) > 0) return;

  const now = new Date();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(8, 0, 0, 0);
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(16, 30, 0, 0);

  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(9, 0, 0, 0);
  const twoDaysAgoEnd = new Date(twoDaysAgo);
  twoDaysAgoEnd.setHours(17, 0, 0, 0);

  await db.insert(shifts).values([
    {
      employeeName: "Maria Schmidt",
      startTime: twoDaysAgo,
      endTime: twoDaysAgoEnd,
      status: "closed",
      startBills50: 2,
      startBills20: 5,
      startBills10: 10,
      startBills5: 4,
      startCoins2: 10,
      startCoins1: 10,
      startCents50: 10,
      startCents20: 10,
      startCents10: 10,
      startTotal: "355.00",
      endBills50: 2,
      endBills20: 5,
      endBills10: 10,
      endBills5: 4,
      endCoins2: 10,
      endCoins1: 10,
      endCents50: 10,
      endCents20: 10,
      endCents10: 10,
      endTotal: "355.00",
      cashRevenue: "127.50",
    },
    {
      employeeName: "Thomas Müller",
      startTime: yesterday,
      endTime: yesterdayEnd,
      status: "closed",
      startBills50: 1,
      startBills20: 3,
      startBills10: 8,
      startBills5: 5,
      startCoins2: 15,
      startCoins1: 15,
      startCents50: 8,
      startCents20: 12,
      startCents10: 10,
      startTotal: "268.40",
      endBills50: 1,
      endBills20: 3,
      endBills10: 8,
      endBills5: 5,
      endCoins2: 15,
      endCoins1: 15,
      endCents50: 8,
      endCents20: 12,
      endCents10: 10,
      endTotal: "268.40",
      cashRevenue: "89.20",
    },
    {
      employeeName: "Lisa Weber",
      startTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      status: "open",
      startBills50: 2,
      startBills20: 4,
      startBills10: 6,
      startBills5: 3,
      startCoins2: 8,
      startCoins1: 12,
      startCents50: 6,
      startCents20: 8,
      startCents10: 10,
      startTotal: "284.60",
    },
  ]);
}
