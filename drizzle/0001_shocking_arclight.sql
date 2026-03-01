CREATE TABLE `agent_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(512) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(128),
	`sizeBytes` int,
	`category` enum('artifact','log','config','other') NOT NULL DEFAULT 'other',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`skillId` int NOT NULL,
	`enabled` boolean DEFAULT true,
	`grantedPermissions` json,
	`installedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('idle','running','error','stopped') NOT NULL DEFAULT 'idle',
	`llmProvider` varchar(64) DEFAULT 'default',
	`systemPrompt` text,
	`config` json,
	`mountedDirs` json,
	`permissions` json,
	`memoryEnabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int,
	`userId` int,
	`action` varchar(255) NOT NULL,
	`category` enum('agent','skill','auth','system','task','file') NOT NULL DEFAULT 'system',
	`severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'info',
	`details` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(64) NOT NULL,
	`label` varchar(255),
	`scopes` json,
	`accessToken` text,
	`refreshToken` text,
	`expiresAt` timestamp,
	`status` enum('active','expired','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`cronExpression` varchar(128),
	`intervalSeconds` int,
	`taskType` enum('cron','interval','once') NOT NULL DEFAULT 'cron',
	`prompt` text,
	`enabled` boolean DEFAULT true,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`lastStatus` enum('pending','running','success','failed') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`version` varchar(32) DEFAULT '1.0.0',
	`author` varchar(255),
	`category` varchar(64),
	`isBuiltIn` boolean DEFAULT false,
	`isVerified` boolean DEFAULT false,
	`permissions` json,
	`config` json,
	`installCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skills_id` PRIMARY KEY(`id`),
	CONSTRAINT `skills_slug_unique` UNIQUE(`slug`)
);
