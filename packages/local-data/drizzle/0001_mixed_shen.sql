CREATE TABLE `debt_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`debtor_id` text NOT NULL,
	`direction` text NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`occurred_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`server_version` integer DEFAULT 0 NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_debt_operations_debtor_id` ON `debt_operations` (`debtor_id`);--> statement-breakpoint
CREATE INDEX `idx_debt_operations_occurred_at` ON `debt_operations` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `debtors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`server_version` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL
);
