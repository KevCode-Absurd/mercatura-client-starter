CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`chat_id` text NOT NULL,
	`seq` integer NOT NULL,
	`role` text NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`via` text DEFAULT 'typed' NOT NULL,
	`tags` text NOT NULL,
	`status` text DEFAULT 'done' NOT NULL,
	`actions` text NOT NULL,
	`question` text,
	`suggestions` text NOT NULL,
	`sources` text NOT NULL,
	`read_by` text DEFAULT 'rules' NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `chat_messages_chat_idx` ON `chat_messages` (`chat_id`,`seq`);--> statement-breakpoint
CREATE TABLE `chats` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`title` text DEFAULT 'New chat' NOT NULL,
	`title_locked` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chats_brand_idx` ON `chats` (`brand_id`,`updated_at`);
