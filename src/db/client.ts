import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from '@/db/schema';

/**
 * Filename is versioned rather than migrated. Pre-release, the schema is regenerated from
 * scratch (see CLAUDE.md) instead of accumulating migrations — which would collide with an
 * older database already on a test device. Bumping the name sidesteps that with no manual
 * "clear app data" step. **Once this ships, stop doing this**: add real migrations and leave
 * the filename alone, or you'll silently wipe real users' history.
 */
export const sqlite = openDatabaseSync('hairlifecycle-v3.db');

export const db = drizzle(sqlite, { schema });
