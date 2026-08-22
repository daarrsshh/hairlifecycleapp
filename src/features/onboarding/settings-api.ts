import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { appSettings } from '@/db/schema';

const SETTINGS_ID = 'singleton';

export async function getAppSettings() {
  const rows = await db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID));
  return rows[0] ?? null;
}

export async function setReminderTimes(reminderAmTime: string, reminderPmTime: string) {
  const existing = await getAppSettings();
  if (existing) {
    await db
      .update(appSettings)
      .set({ reminderAmTime, reminderPmTime })
      .where(eq(appSettings.id, SETTINGS_ID));
  } else {
    await db.insert(appSettings).values({ id: SETTINGS_ID, reminderAmTime, reminderPmTime });
  }
}
