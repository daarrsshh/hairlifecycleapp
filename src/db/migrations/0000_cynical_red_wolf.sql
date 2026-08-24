CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	`photo_reminder_interval_days` integer DEFAULT 15 NOT NULL,
	`notifications_enabled` integer DEFAULT true NOT NULL,
	`last_photo_set_date` text
);
--> statement-breakpoint
CREATE TABLE `dose_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_item_id` text NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`responded_at` text,
	FOREIGN KEY (`routine_item_id`) REFERENCES `routine_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dose_logs_item_date_time` ON `dose_logs` (`routine_item_id`,`date`,`time`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text,
	`date` text NOT NULL,
	`angle` text NOT NULL,
	`file_path` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `photos_date_angle` ON `photos` (`date`,`angle`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`age` integer,
	`hair_loss_type` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routine_items` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`dosage` text,
	`days_of_week` text NOT NULL,
	`times` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routine_pause_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`paused_at` text NOT NULL,
	`resume_expected_at` text,
	`resumed_at` text,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routines_single_active` ON `routines` (`end_date`) WHERE "routines"."end_date" is null;