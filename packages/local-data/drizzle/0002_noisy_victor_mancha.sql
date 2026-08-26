CREATE TABLE `planned_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text NOT NULL,
	`next_due` text NOT NULL,
	`anchor_date` text NOT NULL,
	`regularity` text NOT NULL,
	`confirm_mode` text NOT NULL,
	`reminder` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`server_version` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_planned_payments_next_due` ON `planned_payments` (`next_due`);--> statement-breakpoint
CREATE INDEX `idx_planned_payments_account_id` ON `planned_payments` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_planned_payments_category_id` ON `planned_payments` (`category_id`);