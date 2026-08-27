ALTER TABLE `accounts` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `categories` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `debt_operations` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `debtors` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `planned_payments` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `user_id` text;