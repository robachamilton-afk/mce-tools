ALTER TABLE `custom_analyses` MODIFY COLUMN `status` enum('uploading','extracting_model','confirming_model','mapping','processing','completed','failed') NOT NULL DEFAULT 'uploading';--> statement-breakpoint
ALTER TABLE `custom_analyses` ADD `contract_file_url` text;--> statement-breakpoint
ALTER TABLE `custom_analyses` ADD `contract_file_name` varchar(255);--> statement-breakpoint
ALTER TABLE `custom_analyses` ADD `extracted_model` json;--> statement-breakpoint
ALTER TABLE `custom_analyses` ADD `model_confirmed` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `custom_analyses` ADD `model_confirmed_at` timestamp;