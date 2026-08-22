CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	`reminder_am_time` text DEFAULT '08:00' NOT NULL,
	`reminder_pm_time` text DEFAULT '20:00' NOT NULL,
	`photo_reminder_interval_days` integer DEFAULT 15 NOT NULL,
	`notifications_enabled` integer DEFAULT true NOT NULL,
	`last_photo_set_date` text
);
--> statement-breakpoint
CREATE TABLE `dose_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`treatment_period_id` text NOT NULL,
	`date` text NOT NULL,
	`slot` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`responded_at` text,
	FOREIGN KEY (`treatment_period_id`) REFERENCES `treatment_periods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dose_logs_period_date_slot` ON `dose_logs` (`treatment_period_id`,`date`,`slot`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`treatment_period_id` text,
	`date` text NOT NULL,
	`angle` text NOT NULL,
	`file_path` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`treatment_period_id`) REFERENCES `treatment_periods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`age` integer,
	`hair_loss_type` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `treatment_pause_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`treatment_period_id` text NOT NULL,
	`paused_at` text NOT NULL,
	`resume_expected_at` text,
	`resumed_at` text,
	FOREIGN KEY (`treatment_period_id`) REFERENCES `treatment_periods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `treatment_period_drugs` (
	`id` text PRIMARY KEY NOT NULL,
	`treatment_period_id` text NOT NULL,
	`drug_name` text NOT NULL,
	`dosage` text,
	`frequency` text,
	`slot` text NOT NULL,
	FOREIGN KEY (`treatment_period_id`) REFERENCES `treatment_periods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `treatment_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_type` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
