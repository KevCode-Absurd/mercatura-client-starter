ALTER TABLE `insights` ADD `job` text;--> statement-breakpoint
ALTER TABLE `themes` ADD `angle_status` text DEFAULT 'unrun' NOT NULL;--> statement-breakpoint
ALTER TABLE `themes` ADD `angle_notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `themes` ADD `angle_id` text;
