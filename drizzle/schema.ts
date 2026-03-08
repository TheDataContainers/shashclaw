import { serial, integer, pgTable, text, timestamp, varchar, boolean, json, numeric } from "drizzle-orm/pg-core";

// ── Users ──────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 64 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Agents ─────────────────────────────────────────────────────────────
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 64 }).default("idle").notNull(),
  llmProvider: varchar("llmProvider", { length: 64 }).default("default"),
  systemPrompt: text("systemPrompt"),
  config: json("config"),
  mountedDirs: json("mountedDirs"),
  permissions: json("permissions"),
  memoryEnabled: boolean("memoryEnabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// ── Skills ─────────────────────────────────────────────────────────────
export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  version: varchar("version", { length: 32 }).default("1.0.0"),
  author: varchar("author", { length: 255 }),
  category: varchar("category", { length: 64 }),
  isBuiltIn: boolean("isBuiltIn").default(false),
  isVerified: boolean("isVerified").default(false),
  permissions: json("permissions"),
  config: json("config"),
  installCount: integer("installCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

// ── Agent-Skill junction ───────────────────────────────────────────────
export const agentSkills = pgTable("agent_skills", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId").notNull(),
  skillId: integer("skillId").notNull(),
  enabled: boolean("enabled").default(true),
  grantedPermissions: json("grantedPermissions"),
  installedAt: timestamp("installedAt").defaultNow().notNull(),
});

export type AgentSkill = typeof agentSkills.$inferSelect;
export type InsertAgentSkill = typeof agentSkills.$inferInsert;

// ── Messages (chat history) ────────────────────────────────────────────
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId").notNull(),
  userId: integer("userId").notNull(),
  role: varchar("role", { length: 64 }).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ── Audit Logs ─────────────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId"),
  userId: integer("userId"),
  action: varchar("action", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).default("system").notNull(),
  severity: varchar("severity", { length: 64 }).default("info").notNull(),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ── Scheduled Tasks ────────────────────────────────────────────────────
export const scheduledTasks = pgTable("scheduled_tasks", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId").notNull(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cronExpression: varchar("cronExpression", { length: 128 }),
  intervalSeconds: integer("intervalSeconds"),
  taskType: varchar("taskType", { length: 64 }).default("cron").notNull(),
  prompt: text("prompt"),
  enabled: boolean("enabled").default(true),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  lastStatus: varchar("lastStatus", { length: 64 }).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type InsertScheduledTask = typeof scheduledTasks.$inferInsert;

// ── Agent Files ────────────────────────────────────────────────────────
export const agentFiles = pgTable("agent_files", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId").notNull(),
  userId: integer("userId").notNull(),
  fileName: varchar("fileName", { length: 512 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  sizeBytes: integer("sizeBytes"),
  category: varchar("category", { length: 64 }).default("other").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentFile = typeof agentFiles.$inferSelect;
export type InsertAgentFile = typeof agentFiles.$inferInsert;

// ── Integrations (OAuth connections) ───────────────────────────────────
export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  label: varchar("label", { length: 255 }),
  scopes: json("scopes"),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  expiresAt: timestamp("expiresAt"),
  status: varchar("status", { length: 64 }).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = typeof integrations.$inferInsert;

// ── LLM Configurations ─────────────────────────────────────────────────
export const llmConfigs = pgTable("llm_configs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  agentId: integer("agentId"),
  name: varchar("name", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  model: varchar("model", { length: 255 }).notNull(),
  apiKey: text("apiKey"),
  apiUrl: text("apiUrl"),
  temperature: numeric("temperature", { precision: 3, scale: 2 }).default("0.7"),
  maxTokens: integer("maxTokens").default(2048),
  topP: numeric("topP", { precision: 3, scale: 2 }).default("1.0"),
  isDefault: boolean("isDefault").default(false),
  status: varchar("status", { length: 64 }).default("active").notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LLMConfig = typeof llmConfigs.$inferSelect;
export type InsertLLMConfig = typeof llmConfigs.$inferInsert;

// ── Service Integrations ───────────────────────────────────────────────
export const serviceIntegrations = pgTable("service_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  agentId: integer("agentId"),
  name: varchar("name", { length: 255 }).notNull(),
  service: varchar("service", { length: 64 }).notNull(),
  webhookUrl: text("webhookUrl"),
  apiKey: text("apiKey"),
  config: json("config"),
  enabled: boolean("enabled").default(true),
  status: varchar("status", { length: 64 }).default("active").notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ServiceIntegration = typeof serviceIntegrations.$inferSelect;
export type InsertServiceIntegration = typeof serviceIntegrations.$inferInsert;

// -- Webhooks --
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  events: json("events").notNull(), // Array of event types
  secret: varchar("secret", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  retryCount: integer("retryCount").default(3).notNull(),
  retryDelayMs: integer("retryDelayMs").default(5000).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

// -- Webhook Logs --
export const webhookLogs = pgTable("webhookLogs", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhookId").notNull(),
  event: varchar("event", { length: 64 }).notNull(),
  statusCode: integer("statusCode"),
  attempt: integer("attempt").default(1).notNull(),
  success: boolean("success").notNull(),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;


// ── Usage Evaluations ──────────────────────────────────────────────────────
export const usageEvals = pgTable("usageEvals", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  agentId: integer("agentId").notNull(),
  messageId: integer("messageId"),
  qualityScore: integer("qualityScore"), // 0-10 scale
  completionRate: integer("completionRate"), // 0-100 percentage
  followupRate: integer("followupRate"), // 0-100 percentage (how often user asks follow-up)
  responseTime: integer("responseTime"), // milliseconds
  errorOccurred: boolean("errorOccurred").default(false),
  feedback: text("feedback"), // User feedback text
  tags: json("tags"), // Array of tags for categorization
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UsageEval = typeof usageEvals.$inferSelect;
export type InsertUsageEval = typeof usageEvals.$inferInsert;
