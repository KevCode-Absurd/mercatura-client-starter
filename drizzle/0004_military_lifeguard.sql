CREATE TABLE `media_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`job_id` text,
	`provider` text NOT NULL,
	`kind` text NOT NULL,
	`model` text NOT NULL,
	`purpose` text NOT NULL,
	`prompt` text NOT NULL,
	`request` text NOT NULL,
	`provider_id` text,
	`output_path` text,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `media_calls_job_idx` ON `media_calls` (`job_id`);--> statement-breakpoint
ALTER TABLE `output_jobs` ADD `production` text;--> statement-breakpoint
ALTER TABLE `output_jobs` ADD `error` text;
