CREATE TABLE `ad_references` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`sha256` text,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`width` integer,
	`height` integer,
	`duration` real,
	`categories` text NOT NULL,
	`tags` text NOT NULL,
	`tags_raw` text NOT NULL,
	`awareness` text,
	`sophistication` text,
	`analysis` text,
	`analyzed` integer DEFAULT false NOT NULL,
	`media_path` text,
	`thumb_path` text,
	`remix_revision` integer,
	`synced_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ad_references_kind_idx` ON `ad_references` (`kind`);--> statement-breakpoint
CREATE TABLE `brands` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`name` text NOT NULL,
	`dir` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `extraction_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`source_item_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`llm_call_id` text,
	`raw_output` text,
	`kept` integer DEFAULT 0 NOT NULL,
	`fixed` text NOT NULL,
	`dropped` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `llm_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`task` text NOT NULL,
	`model` text NOT NULL,
	`ref_type` text,
	`ref_id` text,
	`attempt` integer DEFAULT 1 NOT NULL,
	`system_prompt` text NOT NULL,
	`user_prompt` text NOT NULL,
	`response_text` text,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cache_read_tokens` integer DEFAULT 0 NOT NULL,
	`cache_write_tokens` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `llm_calls_brand_idx` ON `llm_calls` (`brand_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `llm_calls_ref_idx` ON `llm_calls` (`ref_id`);--> statement-breakpoint
ALTER TABLE `insights` ADD `extraction_run_id` text;--> statement-breakpoint
ALTER TABLE `insights` ADD `match` text DEFAULT 'seed' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_items` ADD `preprocess_status` text DEFAULT 'done' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_items` ADD `pipeline` text;--> statement-breakpoint
ALTER TABLE `source_items` ADD `external_id` text;
