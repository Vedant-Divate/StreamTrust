CREATE TABLE `ai_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`indicator` text NOT NULL,
	`suggested_value` text NOT NULL,
	`confidence_band` text NOT NULL,
	`confidence_score` real,
	`evidence` text NOT NULL,
	`cues_json` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`latency_ms` integer NOT NULL,
	`raw_response_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`volunteer_id` text NOT NULL,
	`site_id` text NOT NULL,
	`observed_at` text NOT NULL,
	`rain_last_24h` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`consent_at` text,
	`created_at` text NOT NULL,
	`submitted_at` text,
	FOREIGN KEY (`volunteer_id`) REFERENCES `volunteers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fhir_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`bundle_json` text NOT NULL,
	`validator_base_url` text NOT NULL,
	`validator_outcome_json` text,
	`error_count` integer NOT NULL,
	`warning_count` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `indicator_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`indicator` text NOT NULL,
	`final_value` text NOT NULL,
	`decision_source` text NOT NULL,
	`ai_suggestion_id` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ai_suggestion_id`) REFERENCES `ai_suggestions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `indicator_entries_assessment_id_indicator_unique` ON `indicator_entries` (`assessment_id`,`indicator`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`mime` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`bytes` blob NOT NULL,
	`sha256` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rate_events` (
	`id` text PRIMARY KEY NOT NULL,
	`volunteer_id` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`accuracy_m` real,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `volunteers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `warning_acks` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action
);
