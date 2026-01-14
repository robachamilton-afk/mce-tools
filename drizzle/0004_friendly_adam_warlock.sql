CREATE TABLE `equipment_detections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_id` int NOT NULL,
	`type` enum('pcu','substation','combiner_box','transformer','other') NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`status` enum('auto_detected','user_verified','user_added','user_deleted') NOT NULL DEFAULT 'auto_detected',
	`confidence` int,
	`detection_method` varchar(64) DEFAULT 'satellite_llm',
	`detected_at` timestamp NOT NULL DEFAULT (now()),
	`verified_at` timestamp,
	`verified_by` int,
	`notes` text,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_detections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `equipment_detections` ADD CONSTRAINT `equipment_detections_site_id_sites_id_fk` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_detections` ADD CONSTRAINT `equipment_detections_verified_by_users_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;