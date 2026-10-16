CREATE TABLE `hand_edit_asks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`key` text NOT NULL,
	`rule` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`lesson_id` text,
	`upto` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hand_edit_asks_key_idx` ON `hand_edit_asks` (`brand_id`,`key`);--> statement-breakpoint
CREATE TABLE `hand_edits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`script_id` text NOT NULL,
	`surface` text NOT NULL,
	`line` integer,
	`before` text NOT NULL,
	`after` text NOT NULL,
	`changes` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hand_edits_brand_idx` ON `hand_edits` (`brand_id`,`id`);
