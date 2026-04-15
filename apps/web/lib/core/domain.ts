import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { devices, isletRevisions, islets, user } from "../db/schema";

export async function getDeviceForUser(userId: string, deviceName: string) {
  const [device] = await db
    .select()
    .from(devices)
    .where(and(eq(devices.userId, userId), eq(devices.name, deviceName)))
    .limit(1);
  return device ?? null;
}

export async function getIsletByDevicePath(deviceId: string, path: string) {
  const [islet] = await db
    .select()
    .from(islets)
    .where(and(eq(islets.deviceId, deviceId), eq(islets.path, path)))
    .limit(1);
  return islet ?? null;
}

export async function listIsletsForDevice(deviceId: string) {
  return db.select().from(islets).where(eq(islets.deviceId, deviceId));
}

export async function listRevisionsForIslet(isletId: string) {
  return db
    .select()
    .from(isletRevisions)
    .where(eq(isletRevisions.isletId, isletId))
    .orderBy(desc(isletRevisions.createdAt));
}

export async function getUserAndDeviceByNames(username: string, deviceName: string) {
  const [result] = await db
    .select({
      userId: user.id,
      username: user.username,
      deviceId: devices.id,
      deviceName: devices.name,
    })
    .from(user)
    .innerJoin(devices, eq(devices.userId, user.id))
    .where(and(eq(user.username, username), eq(devices.name, deviceName)))
    .limit(1);
  return result ?? null;
}
