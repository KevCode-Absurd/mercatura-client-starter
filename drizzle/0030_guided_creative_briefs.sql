CREATE TABLE `concept_briefs` (
	`concept_id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`brief` text NOT NULL,
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `concept_briefs_brand_idx` ON `concept_briefs` (`brand_id`);--> statement-breakpoint
CREATE TABLE `creative_brief_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`setup` text NOT NULL,
	`plan` text NOT NULL,
	`preview` integer DEFAULT false NOT NULL,
	`approved_ids` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `creative_brief_plans_brand_idx` ON `creative_brief_plans` (`brand_id`);
