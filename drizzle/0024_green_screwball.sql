CREATE TABLE `skill_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`file` text NOT NULL,
	`source` text NOT NULL,
	`brand_id` text DEFAULT '' NOT NULL,
	`feedback_id` text,
	`said` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`before` text NOT NULL,
	`after` text NOT NULL,
	`patch` text,
	`status` text DEFAULT 'open' NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`edit_id` text,
	`decided_at` text,
	`decided_by` text DEFAULT '' NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `skill_proposals_status_idx` ON `skill_proposals` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `skill_proposals_file_idx` ON `skill_proposals` (`file`);--> statement-breakpoint
ALTER TABLE `instruction_edits` ADD `source` text DEFAULT 'hand' NOT NULL;--> statement-breakpoint
ALTER TABLE `instruction_edits` ADD `by` text DEFAULT '' NOT NULL;
