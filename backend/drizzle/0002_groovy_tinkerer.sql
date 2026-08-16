ALTER TABLE `shopping_list` ADD `product_id` integer REFERENCES product(id);--> statement-breakpoint
ALTER TABLE `shopping_list` DROP COLUMN `product`;