CREATE TABLE `compliance_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`kind` text NOT NULL,
	`ref` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`verdict` text NOT NULL,
	`findings` text NOT NULL,
	`passed` text DEFAULT '[]' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`policies_read_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `compliance_checks_brand_idx` ON `compliance_checks` (`brand_id`,`created_at`);
