CREATE TABLE `concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`name` text NOT NULL,
	`persona_id` text NOT NULL,
	`angle` text NOT NULL,
	`offer_id` text NOT NULL,
	`awareness_stage` text NOT NULL,
	`sophistication_stage` integer NOT NULL,
	`theme_ids` text NOT NULL,
	`desire_evidence_theme_ids` text NOT NULL,
	`differentiator_test` text NOT NULL,
	`formats_planned` text NOT NULL,
	`status` text NOT NULL,
	`meta_adset_name` text NOT NULL,
	`parent_concept_id` text
);
--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`source_type` text NOT NULL,
	`origin` text NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `insights` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`source_item_id` text NOT NULL,
	`source_type` text NOT NULL,
	`type` text NOT NULL,
	`quote` text NOT NULL,
	`char_start` integer NOT NULL,
	`char_end` integer NOT NULL,
	`persona_id` text,
	`intensity` integer NOT NULL,
	`objection_class` text,
	`awareness_stage` text,
	`theme_id` text,
	`note` text DEFAULT '' NOT NULL,
	`beat` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `insights_item_idx` ON `insights` (`source_item_id`);--> statement-breakpoint
CREATE INDEX `insights_theme_idx` ON `insights` (`theme_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`kind` text NOT NULL,
	`ref_id` text,
	`status` text NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`error` text,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `output_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`script_id` text NOT NULL,
	`output_type` text NOT NULL,
	`skill` text,
	`count` integer DEFAULT 1 NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`assets` text NOT NULL,
	`review_notes` text,
	`meta_ad_name` text,
	`tag` text DEFAULT 'net_new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scripts` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`concept_id` text NOT NULL,
	`title` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`axes` text NOT NULL,
	`awareness_stage` text NOT NULL,
	`format_target` text,
	`lines` text NOT NULL,
	`hook_variants` text NOT NULL,
	`load_bearing_beat` text NOT NULL,
	`audit` text NOT NULL,
	`est_seconds` integer NOT NULL,
	`status` text NOT NULL,
	`similar_to` text,
	`notes` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`brand_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	PRIMARY KEY(`brand_id`, `key`)
);
--> statement-breakpoint
CREATE TABLE `skill_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`skill` text NOT NULL,
	`job_id` text,
	`input` text NOT NULL,
	`output` text,
	`duration_ms` integer,
	`cost_usd` real,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_items` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`source_type` text NOT NULL,
	`date` text,
	`title` text,
	`raw_text` text NOT NULL,
	`clean_text` text NOT NULL,
	`redacted_text` text NOT NULL,
	`meta` text NOT NULL,
	`persona_hint` text,
	`import_batch_id` text NOT NULL,
	`extraction_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `source_items_type_idx` ON `source_items` (`brand_id`,`source_type`);--> statement-breakpoint
CREATE TABLE `themes` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`summary` text NOT NULL,
	`beat` text NOT NULL,
	`frequency` integer NOT NULL,
	`intensity_avg` real NOT NULL,
	`intensity_peak` integer NOT NULL,
	`source_types` text NOT NULL,
	`personas` text NOT NULL,
	`objection_classes` text NOT NULL,
	`score` real NOT NULL,
	`rank` integer NOT NULL,
	`newest_date` text,
	`locked` integer DEFAULT false NOT NULL,
	`insight_ids` text NOT NULL
);
