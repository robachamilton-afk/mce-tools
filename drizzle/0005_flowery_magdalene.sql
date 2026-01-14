CREATE TABLE `custom_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_id` int NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('uploading','mapping','processing','completed','failed') NOT NULL DEFAULT 'uploading',
	`contract_capacity_mw` decimal(10,3),
	`tariff_per_mwh` decimal(10,2),
	`contract_start_date` timestamp,
	`contract_end_date` timestamp,
	`scada_file_url` text,
	`scada_file_name` varchar(255),
	`meteo_file_url` text,
	`meteo_file_name` varchar(255),
	`scada_column_mapping` json,
	`meteo_column_mapping` json,
	`rows_processed` int,
	`processing_started_at` timestamp,
	`processing_completed_at` timestamp,
	`error_message` text,
	`assessment_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `custom_analyses` ADD CONSTRAINT `custom_analyses_site_id_sites_id_fk` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_analyses` ADD CONSTRAINT `custom_analyses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_analyses` ADD CONSTRAINT `custom_analyses_assessment_id_assessments_id_fk` FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE no action ON UPDATE no action;