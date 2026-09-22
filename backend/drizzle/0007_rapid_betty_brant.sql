CREATE TABLE `shopping_list_source` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shopping_list_id` integer NOT NULL,
	`recipe_id` integer,
	`recipe_name` text,
	`created_on` integer NOT NULL,
	FOREIGN KEY (`shopping_list_id`) REFERENCES `shopping_list`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE set null
);
