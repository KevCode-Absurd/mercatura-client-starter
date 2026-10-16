CREATE TABLE `founder_answers` (
	`brand_id` text NOT NULL,
	`question_id` text NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`skipped` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	PRIMARY KEY(`brand_id`, `question_id`)
);
