CREATE TABLE `meal_plan_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`recipe_id` integer,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_on` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE no action
);
