ALTER TABLE `site_configurations` ADD `pitch` decimal(6,2);--> statement-breakpoint
ALTER TABLE `site_configurations` ADD `coordinate_confidence` int;--> statement-breakpoint
ALTER TABLE `site_configurations` ADD `tracking_confidence` int;--> statement-breakpoint
ALTER TABLE `site_configurations` ADD `gcr_confidence` int;--> statement-breakpoint
ALTER TABLE `site_configurations` ADD `pitch_confidence` int;--> statement-breakpoint
ALTER TABLE `site_configurations` ADD `equipment_confidence` int;--> statement-breakpoint
ALTER TABLE `site_configurations` ADD `images_analyzed` int;--> statement-breakpoint
ALTER TABLE `site_configurations` ADD `detection_notes` text;