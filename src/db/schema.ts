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

export const treatmentPeriods = sqliteTable('treatment_periods', {
  id: text('id').primaryKey(),
  planType: text('plan_type').notNull(), // preset key, or 'custom'
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date'),
  status: text('status', { enum: ['active', 'paused', 'ended'] })
    .notNull()
    .default('active'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

// A period can be paused and resumed multiple times; each cycle is its own row
// so the Timeline can render every pause as a distinct dashed segment (PRD §5.6).
export const treatmentPausePeriods = sqliteTable('treatment_pause_periods', {
  id: text('id').primaryKey(),
  treatmentPeriodId: text('treatment_period_id')
    .notNull()
    .references(() => treatmentPeriods.id),
  pausedAt: text('paused_at').notNull(), // YYYY-MM-DD
  resumeExpectedAt: text('resume_expected_at'),
  resumedAt: text('resumed_at'), // null while still paused
});

export const treatmentPeriodDrugs = sqliteTable('treatment_period_drugs', {
  id: text('id').primaryKey(),
  treatmentPeriodId: text('treatment_period_id')
    .notNull()
    .references(() => treatmentPeriods.id),
  drugName: text('drug_name').notNull(),
  dosage: text('dosage'),
  frequency: text('frequency'),
  slot: text('slot', { enum: ['am', 'pm', 'both'] }).notNull(),
});

export const doseLogs = sqliteTable(
  'dose_logs',
  {
    id: text('id').primaryKey(),
    treatmentPeriodId: text('treatment_period_id')
      .notNull()
      .references(() => treatmentPeriods.id),
    date: text('date').notNull(), // YYYY-MM-DD
    slot: text('slot', { enum: ['am', 'pm'] }).notNull(),
    state: text('state', { enum: ['pending', 'taken', 'skipped', 'missed'] })
      .notNull()
      .default('pending'),
    locked: integer('locked', { mode: 'boolean' }).notNull().default(false),
    respondedAt: text('responded_at'),
  },
  (table) => [uniqueIndex('dose_logs_period_date_slot').on(table.treatmentPeriodId, table.date, table.slot)]
);

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  treatmentPeriodId: text('treatment_period_id').references(() => treatmentPeriods.id),
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
  reminderAmTime: text('reminder_am_time').notNull().default('08:00'),
  reminderPmTime: text('reminder_pm_time').notNull().default('20:00'),
  photoReminderIntervalDays: integer('photo_reminder_interval_days').notNull().default(15),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  lastPhotoSetDate: text('last_photo_set_date'),
});
