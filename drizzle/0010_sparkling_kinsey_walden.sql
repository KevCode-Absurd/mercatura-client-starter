CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`ref_type` text NOT NULL,
	`ref_id` text DEFAULT '' NOT NULL,
	`item_id` text,
	`asset` text,
	`product_id` text,
	`text` text NOT NULL,
	`via` text DEFAULT 'typed' NOT NULL,
	`action` text DEFAULT 'note' NOT NULL,
	`lesson_ids` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'logged' NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `feedback_brand_idx` ON `feedback` (`brand_id`,`created_at`);
