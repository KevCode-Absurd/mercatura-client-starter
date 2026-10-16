CREATE TABLE `asks` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`text` text NOT NULL,
	`via` text DEFAULT 'typed' NOT NULL,
	`tags` text NOT NULL,
	`intent` text,
	`question` text,
	`status` text DEFAULT 'ready' NOT NULL,
	`read_by` text DEFAULT 'rules' NOT NULL,
	`result` text NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `asks_brand_idx` ON `asks` (`brand_id`,`created_at`);
