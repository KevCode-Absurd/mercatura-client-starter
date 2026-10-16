CREATE TABLE `inspect_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`kind` text NOT NULL,
	`task` text,
	`part` text,
	`block` text,
	`call_id` text,
	`file` text,
	`text` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inspect_notes_task_idx` ON `inspect_notes` (`task`);--> statement-breakpoint
CREATE INDEX `inspect_notes_file_idx` ON `inspect_notes` (`file`);--> statement-breakpoint
CREATE TABLE `instruction_edits` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`file` text NOT NULL,
	`before` text NOT NULL,
	`after` text NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `instruction_edits_file_idx` ON `instruction_edits` (`file`,`created_at`);
