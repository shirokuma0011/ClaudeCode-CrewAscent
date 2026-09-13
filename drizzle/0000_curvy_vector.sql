CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`notes` text NOT NULL,
	`token_hash` text NOT NULL,
	`request_key` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` integer NOT NULL,
	`cancelled_at` integer,
	`privacy_version` text NOT NULL,
	FOREIGN KEY (`slot_id`) REFERENCES `slots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_token_hash_unique` ON `bookings` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_request_key_unique` ON `bookings` (`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_one_per_slot` ON `bookings` (`slot_id`) WHERE "bookings"."status" = 'confirmed';--> statement-breakpoint
CREATE INDEX `idx_bookings_created_at` ON `bookings` (`created_at`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`received_at` integer NOT NULL,
	`quote_id` text,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`privacy_version` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inquiries_request_key_unique` ON `inquiries` (`request_key`);--> statement-breakpoint
CREATE INDEX `idx_inquiries_created_at` ON `inquiries` (`created_at`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `idx_outbox_sent_at` ON `outbox` (`sent_at`);--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`plan` text NOT NULL,
	`customer_type` text NOT NULL,
	`email` text NOT NULL,
	`stage` text NOT NULL,
	`amount` integer NOT NULL,
	`total` integer NOT NULL,
	`scope` text NOT NULL,
	`delivery` text NOT NULL,
	`expires` integer NOT NULL,
	`created_at` integer NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`checkout_url` text,
	`order_id` text,
	`accepted_at` integer,
	`contract_version` text NOT NULL,
	`paid_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_token_hash_unique` ON `quotes` (`token_hash`);--> statement-breakpoint
CREATE TABLE `rates` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rates_expires` ON `rates` (`expires`);--> statement-breakpoint
CREATE TABLE `slots` (
	`id` text PRIMARY KEY NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `slots_starts_at_unique` ON `slots` (`starts_at`);--> statement-breakpoint
CREATE INDEX `idx_slots_active_start` ON `slots` (`active`,`starts_at`);