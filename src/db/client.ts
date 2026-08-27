import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from '@/db/schema';

/**
 * ⚠️ **NEVER CHANGE THIS FILENAME.**
 *
 * It is not a version marker. It is the *address of the user's data* — every logged dose, every
 * progress photo, months or years of history. Point the app at a different name and all of it
 * is silently abandoned: no error, no crash, no way back from inside the app. The user opens a
 * treatment tracker they've kept for a year and finds it empty.
 *
 * It deliberately carries no version number. It used to be `hairlifecycle-v3.db`, and that
 * suffix was an invitation to bump it to `-v4` — which is exactly what the pre-release workflow
 * told you to do while wiping test data was free. The name was renamed before launch precisely
 * so there is nothing here to increment.
 *
 * Schema changes ship as **new migrations** (`0001`, `0002`, …), never by regenerating `0000`
 * and never by renaming this file. See CLAUDE.md.
 */
export const sqlite = openDatabaseSync('hairlifecycle.db');

export const db = drizzle(sqlite, { schema });
