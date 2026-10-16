CREATE TABLE `reference_uses` (
	`brand_id` text NOT NULL,
	`reference_key` text NOT NULL,
	`use_key` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	PRIMARY KEY(`brand_id`, `reference_key`, `use_key`)
);
