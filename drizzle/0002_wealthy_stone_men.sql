CREATE TABLE `script_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`script_id` text NOT NULL,
	`version` integer NOT NULL,
	`source` text NOT NULL,
	`snapshot` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `script_versions_script_idx` ON `script_versions` (`script_id`);--> statement-breakpoint
ALTER TABLE `scripts` ADD `test_plan` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `scripts` ADD `reference_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `scripts` ADD `hook_variant_of` text;--> statement-breakpoint
ALTER TABLE `scripts` ADD `theme_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `themes` ADD `guardrail` text;
