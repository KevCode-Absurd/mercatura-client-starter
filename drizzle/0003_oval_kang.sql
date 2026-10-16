ALTER TABLE `ad_references` ADD `source` text DEFAULT 'remix' NOT NULL;--> statement-breakpoint
ALTER TABLE `ad_references` ADD `media_root` text DEFAULT 'skills' NOT NULL;--> statement-breakpoint
ALTER TABLE `ad_references` ADD `added_by_brand` text;--> statement-breakpoint
ALTER TABLE `ad_references` ADD `notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `ad_references` ADD `title_locked` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ad_references` ADD `analysis_status` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `ad_references` ADD `analysis_error` text;
