CREATE TABLE `usageEvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int NOT NULL,
	`messageId` int,
	`qualityScore` int,
	`completionRate` int,
	`followupRate` int,
	`responseTime` int,
	`errorOccurred` boolean DEFAULT false,
	`feedback` text,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usageEvals_id` PRIMARY KEY(`id`)
);
