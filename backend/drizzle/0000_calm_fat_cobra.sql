CREATE TABLE `todo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`emoji` text,
	`notes` text,
	`frequency_days` integer,
	`next_completion_on` integer,
	`created_on` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `todo_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`todo_id` integer,
	`completed_on` integer NOT NULL,
	FOREIGN KEY (`todo_id`) REFERENCES `todo`(`id`) ON UPDATE no action ON DELETE no action
);
