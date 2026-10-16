CREATE TABLE `landing_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source` text NOT NULL,
	`product_id` text NOT NULL,
	`persona_id` text,
	`offer_id` text,
	`ad` text,
	`brief` text NOT NULL,
	`sections` text NOT NULL,
	`checks` text NOT NULL,
	`parent_id` text,
	`variant_note` text DEFAULT '' NOT NULL,
	`writer` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`capture_id` text,
	`log` text NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `landing_pages_brand_idx` ON `landing_pages` (`brand_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `site_scans` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`page_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`result` text,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `site_scans_brand_idx` ON `site_scans` (`brand_id`,`kind`,`created_at`);
