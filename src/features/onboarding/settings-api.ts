import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { appSettings } from '@/db/schema';

const SETTINGS_ID = 'singleton';

/**
 * App-wide settings only. Reminder *times* deliberately no longer live here — each routine
 * item carries its own days and times, so there's no single global AM/PM pair to store.
 */
export async function getAppSettings() {
  const rows = await db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID));
  return rows[0] ?? null;
}

async function upsertSettings(patch: Partial<typeof appSettings.$inferInsert>) {
  const existing = await getAppSettings();
  if (existing) {
    await db.update(appSettings).set(patch).where(eq(appSettings.id, SETTINGS_ID));
  } else {
    await db.insert(appSettings).values({ id: SETTINGS_ID, ...patch });
  }
}

export async function ensureAppSettings() {
  await upsertSettings({});
}

export async function setNotificationsEnabled(enabled: boolean) {
  await upsertSettings({ notificationsEnabled: enabled });
}

export async function setLastPhotoSetDate(date: string) {
  await upsertSettings({ lastPhotoSetDate: date });
}
