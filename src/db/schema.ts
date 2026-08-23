import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  age: integer('age'),
  hairLossType: text('hair_loss_type'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

/**
 * One personal routine = a bundle of items the user follows together. Starting a new routine
 * ends the previous one rather than editing it, so history stays intact (PRD §5.5).
 */
export const routines = sqliteTable('routines', {
  id: text('id').primaryKey(),
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date'),
  status: text('status', { enum: ['active', 'paused', 'ended'] })
    .notNull()
    .default('active'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

// A routine can be paused and resumed multiple times; each cycle is its own row so the
// Timeline can render every pause as a distinct segment (PRD §5.6).
export const routinePausePeriods = sqliteTable('routine_pause_periods', {
  id: text('id').primaryKey(),
  routineId: text('routine_id')
    .notNull()
    .references(() => routines.id),
  pausedAt: text('paused_at').notNull(), // YYYY-MM-DD
  resumeExpectedAt: text('resume_expected_at'),
  resumedAt: text('resumed_at'), // null while still paused
});

/**
 * A single thing the user does — a pill, a topical, or a device session — carrying its own
 * schedule. This is what makes "Minoxidil twice daily + Finasteride each morning + LLLT on
 * Mon/Wed/Fri" expressible; there are no fixed AM/PM slots anywhere in the model.
 *
 * `daysOfWeek` is 0(Sun)–6(Sat). `times` is a list of 'HH:MM' — more than one entry means the
 * item is done multiple times on each scheduled day, and each time is logged independently.
 */
export const routineItems = sqliteTable('routine_items', {
  id: text('id').primaryKey(),
  routineId: text('routine_id')
    .notNull()
    .references(() => routines.id),
  type: text('type', { enum: ['oral', 'topical', 'device'] }).notNull(),
  name: text('name').notNull(),
  dosage: text('dosage'),
  daysOfWeek: text('days_of_week', { mode: 'json' }).$type<number[]>().notNull(),
  times: text('times', { mode: 'json' }).$type<string[]>().notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

/**
 * One row per (item, date, time) — so when someone takes their morning Minoxidil but skips
 * the evening one, or takes Finasteride but not Minoxidil, the record says exactly which.
 */
export const doseLogs = sqliteTable(
  'dose_logs',
  {
    id: text('id').primaryKey(),
    routineItemId: text('routine_item_id')
      .notNull()
      .references(() => routineItems.id),
    date: text('date').notNull(), // YYYY-MM-DD
    time: text('time').notNull(), // 'HH:MM', matching one of the item's scheduled times
    state: text('state', { enum: ['pending', 'taken', 'skipped', 'missed'] })
      .notNull()
      .default('pending'),
    locked: integer('locked', { mode: 'boolean' }).notNull().default(false),
    respondedAt: text('responded_at'),
  },
  (table) => [uniqueIndex('dose_logs_item_date_time').on(table.routineItemId, table.date, table.time)]
);

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  routineId: text('routine_id').references(() => routines.id),
  date: text('date').notNull(),
  angle: text('angle', {
    enum: ['crown', 'hairline', 'left_temple', 'right_temple'],
  }).notNull(),
  filePath: text('file_path').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey().default('singleton'),
  photoReminderIntervalDays: integer('photo_reminder_interval_days').notNull().default(15),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  lastPhotoSetDate: text('last_photo_set_date'),
});
