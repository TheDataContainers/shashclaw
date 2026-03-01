CREATE TABLE `webhookLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookId` int NOT NULL,
	`event` varchar(64) NOT NULL,
	`statusCode` int,
	`attempt` int NOT NULL DEFAULT 1,
	`success` boolean NOT NULL,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhookLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`events` json NOT NULL,
	`secret` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`retryCount` int NOT NULL DEFAULT 3,
	`retryDelayMs` int NOT NULL DEFAULT 5000,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
