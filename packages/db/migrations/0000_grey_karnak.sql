CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`before` text DEFAULT '{}' NOT NULL,
	`after` text DEFAULT '{}' NOT NULL,
	`admin_uid` text NOT NULL,
	`admin_email` text NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`addresses` text DEFAULT '[]' NOT NULL,
	`account_type` text DEFAULT 'registered' NOT NULL,
	`order_count` integer DEFAULT 0 NOT NULL,
	`total_spent` integer DEFAULT 0 NOT NULL,
	`blacklisted` integer DEFAULT false NOT NULL,
	`blacklist_reason` text,
	`notes` text DEFAULT '' NOT NULL,
	`clerk_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `delivery_days` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`day_of_week` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`frozen` integer DEFAULT false NOT NULL,
	`cutoff_time` integer NOT NULL,
	`max_orders` integer DEFAULT 50 NOT NULL,
	`order_count` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`route_generated` integer DEFAULT false NOT NULL,
	`route_generated_at` integer,
	`delivery_window_start` text DEFAULT '09:00',
	`driver_uid` text,
	`zones` text DEFAULT '',
	`type` text DEFAULT 'delivery' NOT NULL,
	`market_location` text,
	`run_started_at` integer,
	`run_completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`driver_uid`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `delivery_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`delivery_day_id` text NOT NULL,
	`name` text NOT NULL,
	`zone` text,
	`color` text DEFAULT '#1B3A2E' NOT NULL,
	`driver_uid` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`sequence` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`delivery_day_id`) REFERENCES `delivery_days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`driver_uid`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `driver_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`driver_uid` text NOT NULL,
	`driver_name` text NOT NULL,
	`delivery_day_id` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`last_lat` real DEFAULT 0 NOT NULL,
	`last_lng` real DEFAULT 0 NOT NULL,
	`last_updated` integer NOT NULL,
	`breadcrumb` text DEFAULT '[]' NOT NULL,
	`total_stops` integer DEFAULT 0 NOT NULL,
	`completed_stops` integer DEFAULT 0 NOT NULL,
	`flagged_stops` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`driver_uid`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delivery_day_id`) REFERENCES `delivery_days`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`customer_id` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`recipient_email` text NOT NULL,
	`resend_id` text,
	`error` text,
	`sent_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`items` text NOT NULL,
	`subtotal` integer NOT NULL,
	`delivery_fee` integer NOT NULL,
	`gst` integer NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`delivery_day_id` text NOT NULL,
	`delivery_address` text NOT NULL,
	`fulfillment_type` text DEFAULT 'delivery' NOT NULL,
	`postcode_zone` text DEFAULT '' NOT NULL,
	`payment_intent_id` text DEFAULT '' NOT NULL,
	`payment_provider` text DEFAULT 'stripe' NOT NULL,
	`payment_status` text DEFAULT 'paid' NOT NULL,
	`notes` text,
	`internal_notes` text,
	`proof_url` text,
	`packed_at` integer,
	`packed_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delivery_day_id`) REFERENCES `delivery_days`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`is_meat_pack` integer DEFAULT false NOT NULL,
	`price_per_kg` integer,
	`fixed_price` integer,
	`weight_options` text,
	`pack_contents` text,
	`image_url` text DEFAULT '' NOT NULL,
	`stock_on_hand` real DEFAULT 0 NOT NULL,
	`min_threshold` real DEFAULT 0 NOT NULL,
	`max_stock` real,
	`supplier_id` text,
	`active` integer DEFAULT true NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`gst_applicable` integer DEFAULT true NOT NULL,
	`seasonal_start` integer,
	`seasonal_end` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`type` text NOT NULL,
	`qty` real NOT NULL,
	`unit` text NOT NULL,
	`reason` text,
	`order_id` text,
	`supplier_id` text,
	`stocktake_session_id` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stocktake_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`categories` text DEFAULT '[]' NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`total_variance_kg` real DEFAULT 0 NOT NULL,
	`total_variance_value` integer DEFAULT 0 NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stops` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`delivery_day_id` text NOT NULL,
	`run_id` text,
	`customer_id` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`address` text NOT NULL,
	`items` text NOT NULL,
	`sequence` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`estimated_arrival` integer,
	`completed_at` integer,
	`proof_url` text,
	`lat` real,
	`lng` real,
	`customer_note` text,
	`driver_note` text,
	`flag_reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delivery_day_id`) REFERENCES `delivery_days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `delivery_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`email` text NOT NULL,
	`box_id` text NOT NULL,
	`box_name` text NOT NULL,
	`alternate_box_id` text,
	`alternate_box_name` text,
	`next_is_alternate` integer DEFAULT false NOT NULL,
	`frequency` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_order_generated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`abn` text DEFAULT '' NOT NULL,
	`payment_terms` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'staff' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`phone` text,
	`address` text,
	`vehicle_info` text,
	`registration_number` text,
	`license_number` text,
	`next_of_kin` text,
	`zones` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_clerk_id_unique` ON `customers` (`clerk_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);