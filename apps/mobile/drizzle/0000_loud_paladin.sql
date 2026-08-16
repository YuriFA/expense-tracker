CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`opening_balance` integer NOT NULL,
	`manual_adjustment` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`server_version` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`slug` text,
	`version` integer DEFAULT 1 NOT NULL,
	`server_version` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_conflicts` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`op_id` text,
	`kind` text NOT NULL,
	`base_version` integer NOT NULL,
	`server_version` integer NOT NULL,
	`local_state_json` text NOT NULL,
	`server_state_json` text NOT NULL,
	`created_at` text NOT NULL,
	`resolved_at` text
);
--> statement-breakpoint
CREATE TABLE `sync_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_outbox` (
	`op_id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`op` text NOT NULL,
	`payload_json` text NOT NULL,
	`base_version` integer NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `idx_sync_outbox_entity` ON `sync_outbox` (`entity`,`entity_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`occurred_at` text NOT NULL,
	`updated_at` text,
	`account_id` text,
	`category_id` text,
	`from_account_id` text,
	`to_account_id` text,
	`version` integer DEFAULT 1 NOT NULL,
	`server_version` integer DEFAULT 0 NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_occurred_at` ON `transactions` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_transactions_account_id` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category_id` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_type_occurred_at` ON `transactions` (`type`,`occurred_at`);