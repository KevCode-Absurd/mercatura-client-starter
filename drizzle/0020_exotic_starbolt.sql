CREATE TABLE `check_failures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`area` text NOT NULL,
	`point` text NOT NULL,
	`note` text NOT NULL,
	`lesson_id` text,
	`ref_type` text NOT NULL,
	`ref_id` text DEFAULT '' NOT NULL,
	`item_id` text,
	`product_id` text,
	`handled` text
);
--> statement-breakpoint
CREATE INDEX `check_failures_brand_idx` ON `check_failures` (`brand_id`,`handled`,`area`,`point`);
