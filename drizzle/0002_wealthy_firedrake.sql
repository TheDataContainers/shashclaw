CREATE TABLE `llm_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int,
	`name` varchar(255) NOT NULL,
	`provider` enum('openai','anthropic','custom','manus') NOT NULL,
	`model` varchar(255) NOT NULL,
	`apiKey` text,
	`apiUrl` text,
	`temperature` decimal(3,2) DEFAULT '0.7',
	`maxTokens` int DEFAULT 2048,
	`topP` decimal(3,2) DEFAULT '1.0',
	`isDefault` boolean DEFAULT false,
	`status` enum('active','inactive','error') NOT NULL DEFAULT 'active',
	`lastTestedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `llm_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int,
	`name` varchar(255) NOT NULL,
	`service` enum('slack','discord','github','webhook','custom') NOT NULL,
	`webhookUrl` text,
	`apiKey` text,
	`config` json,
	`enabled` boolean DEFAULT true,
	`status` enum('active','inactive','error') NOT NULL DEFAULT 'active',
	`lastTestedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_integrations_id` PRIMARY KEY(`id`)
);
