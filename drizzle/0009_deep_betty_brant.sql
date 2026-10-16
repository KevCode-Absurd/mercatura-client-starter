CREATE TABLE `library_refs` (
	`id` text PRIMARY KEY NOT NULL,
	`library` text NOT NULL,
	`file` text NOT NULL,
	`thumb` text,
	`vertical` text DEFAULT '' NOT NULL,
	`type` text NOT NULL,
	`group_name` text,
	`brand` text,
	`note` text DEFAULT '' NOT NULL,
	`usable` integer DEFAULT true NOT NULL,
	`craft` integer DEFAULT 3 NOT NULL,
	`width` integer,
	`height` integer,
	`tags` text NOT NULL,
	`analysis` text,
	`analyzed` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `library_refs_lib_idx` ON `library_refs` (`library`,`type`);--> statement-breakpoint
CREATE INDEX `library_refs_vertical_idx` ON `library_refs` (`library`,`vertical`);--> statement-breakpoint
CREATE TABLE `studio_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`kind` text NOT NULL,
	`product_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`aspects` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`items` text NOT NULL,
	`audit` text NOT NULL,
	`log` text NOT NULL,
	`context` text NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `studio_runs_brand_idx` ON `studio_runs` (`brand_id`,`kind`);
