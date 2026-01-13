CREATE TABLE `assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_id` int NOT NULL,
	`assessment_date` timestamp NOT NULL DEFAULT (now()),
	`date_range_start` timestamp NOT NULL,
	`date_range_end` timestamp NOT NULL,
	`technical_pr` decimal(5,2),
	`overall_pr` decimal(5,2),
	`curtailment_mwh` decimal(10,2),
	`curtailment_pct` decimal(5,2),
	`underperformance_mwh` decimal(10,2),
	`lost_revenue_estimate` decimal(12,2),
	`report_pdf_url` text,
	`data_csv_url` text,
	`visualization_png_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site_id` int NOT NULL,
	`tracking_type` enum('fixed','single_axis','dual_axis','unknown') NOT NULL DEFAULT 'unknown',
	`axis_azimuth` decimal(5,2),
	`tilt_angle` decimal(5,2),
	`max_rotation_angle` decimal(5,2),
	`gcr` decimal(4,3),
	`detection_method` enum('satellite','performance','manual','hybrid'),
	`confidence_score` int,
	`last_validated` timestamp,
	`satellite_image_url` text,
	`satellite_image_date` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`duid` varchar(32),
	`name` text NOT NULL,
	`capacity_dc_mw` decimal(10,3),
	`capacity_ac_mw` decimal(10,3),
	`region` varchar(16),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`commissioning_date` timestamp,
	`owner` text,
	`status` varchar(32),
	`data_source` varchar(64) DEFAULT 'APVI',
	`user_modified` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sites_id` PRIMARY KEY(`id`),
	CONSTRAINT `sites_duid_unique` UNIQUE(`duid`)
);
--> statement-breakpoint
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_site_id_sites_id_fk` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `site_configurations` ADD CONSTRAINT `site_configurations_site_id_sites_id_fk` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE cascade ON UPDATE no action;