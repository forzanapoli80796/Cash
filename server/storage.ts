import { type Shift, type InsertShiftStart, type EndShift, shifts } from "@shared/schema";
import { db } from "./db";
import { eq, desc, lt, sql, and } from "drizzle-orm";

export interface IStorage {
  createShift(data: InsertShiftStart): Promise<Shift>;
  getOpenShifts(): Promise<Shift[]>;
  getOpenShiftByEmployee(employeeName: string): Promise<Shift | undefined>;
  getShiftById(id: number): Promise<Shift | undefined>;
  endShift(id: number, data: EndShift): Promise<Shift>;
  getShiftsLast14Days(): Promise<Shift[]>;
  deleteOldShifts(): Promise<void>;
  deleteShift(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createShift(data: InsertShiftStart): Promise<Shift> {
    const [shift] = await db.insert(shifts).values(data).returning();
    return shift;
  }

  async getOpenShifts(): Promise<Shift[]> {
    return db.select().from(shifts).where(eq(shifts.status, "open")).orderBy(desc(shifts.startTime));
  }

  async getOpenShiftByEmployee(employeeName: string): Promise<Shift | undefined> {
    const results = await db
      .select()
      .from(shifts)
      .where(and(
        eq(shifts.status, "open"),
        sql`lower(${shifts.employeeName}) = lower(${employeeName})`
      ));
    return results[0];
  }

  async getShiftById(id: number): Promise<Shift | undefined> {
    const results = await db.select().from(shifts).where(eq(shifts.id, id));
    return results[0];
  }

  async endShift(id: number, data: EndShift): Promise<Shift> {
    const [shift] = await db
      .update(shifts)
      .set({
        ...data,
        endTime: new Date(),
        status: "closed",
      })
      .where(eq(shifts.id, id))
      .returning();
    return shift;
  }

  async getShiftsLast14Days(): Promise<Shift[]> {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return db
      .select()
      .from(shifts)
      .where(
        sql`${shifts.startTime} >= ${fourteenDaysAgo}`
      )
      .orderBy(desc(shifts.startTime));
  }

  async deleteOldShifts(): Promise<void> {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    await db.delete(shifts).where(lt(shifts.startTime, fourteenDaysAgo));
  }

  async deleteShift(id: number): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }
}

export const storage = new DatabaseStorage();
