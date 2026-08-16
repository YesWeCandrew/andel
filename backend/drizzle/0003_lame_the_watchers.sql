PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_shopping_list` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`completed_on` integer,
	`created_on` integer NOT NULL,
	`quantity` real,
	`unit_id` integer,
	`product_id` integer,
	FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_shopping_list`("id", "active", "completed_on", "created_on", "quantity", "unit_id", "product_id") SELECT "id", "active", "completed_on", "created_on", "quantity", "unit_id", "product_id" FROM `shopping_list`;--> statement-breakpoint
DROP TABLE `shopping_list`;--> statement-breakpoint
ALTER TABLE `__new_shopping_list` RENAME TO `shopping_list`;--> statement-breakpoint
PRAGMA foreign_keys=ON;