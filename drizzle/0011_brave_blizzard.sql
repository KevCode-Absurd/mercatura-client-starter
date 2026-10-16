CREATE TABLE `sprints` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`title` text NOT NULL,
	`size` integer NOT NULL,
	`split` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`stage` text DEFAULT 'plan' NOT NULL,
	`assets` text NOT NULL,
	`angles` text NOT NULL,
	`slots` text NOT NULL,
	`audit` text NOT NULL,
	`set_ids` text NOT NULL,
	`log` text NOT NULL,
	`approved` text NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `sprints_brand_idx` ON `sprints` (`brand_id`);
