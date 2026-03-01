import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal } from "drizzle-orm/mysql-core";

// ── Users ──────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Agents ─────────────────────────────────────────────────────────────
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["idle", "running", "error", "stopped"]).default("idle").notNull(),
  llmProvider: varchar("llmProvider", { length: 64 }).default("default"),
  systemPrompt: text("systemPrompt"),
  config: json("config"),
  mountedDirs: json("mountedDirs"),
  permissions: json("permissions"),
  memoryEnabled: boolean("memoryEnabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// ── Skills ─────────────────────────────────────────────────────────────
export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
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
  installCount: int("installCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

// ── Agent-Skill junction ───────────────────────────────────────────────
export const agentSkills = mysqlTable("agent_skills", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  skillId: int("skillId").notNull(),
  enabled: boolean("enabled").default(true),
  grantedPermissions: json("grantedPermissions"),
  installedAt: timestamp("installedAt").defaultNow().notNull(),
});

export type AgentSkill = typeof agentSkills.$inferSelect;
export type InsertAgentSkill = typeof agentSkills.$inferInsert;

// ── Messages (chat history) ────────────────────────────────────────────
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ── Audit Logs ─────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId"),
  userId: int("userId"),
  action: varchar("action", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["agent", "skill", "auth", "system", "task", "file"]).default("system").notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).default("info").notNull(),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ── Scheduled Tasks ────────────────────────────────────────────────────
export const scheduledTasks = mysqlTable("scheduled_tasks", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cronExpression: varchar("cronExpression", { length: 128 }),
  intervalSeconds: int("intervalSeconds"),
  taskType: mysqlEnum("taskType", ["cron", "interval", "once"]).default("cron").notNull(),
  prompt: text("prompt"),
  enabled: boolean("enabled").default(true),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  lastStatus: mysqlEnum("lastStatus", ["pending", "running", "success", "failed"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type InsertScheduledTask = typeof scheduledTasks.$inferInsert;

// ── Agent Files ────────────────────────────────────────────────────────
export const agentFiles = mysqlTable("agent_files", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 512 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  sizeBytes: int("sizeBytes"),
  category: mysqlEnum("category", ["artifact", "log", "config", "other"]).default("other").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentFile = typeof agentFiles.$inferSelect;
export type InsertAgentFile = typeof agentFiles.$inferInsert;

// ── Integrations (OAuth connections) ───────────────────────────────────
export const integrations = mysqlTable("integrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  label: varchar("label", { length: 255 }),
  scopes: json("scopes"),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  expiresAt: timestamp("expiresAt"),
  status: mysqlEnum("status", ["active", "expired", "revoked"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = typeof integrations.$inferInsert;

// ── LLM Configurations ─────────────────────────────────────────────────
export const llmConfigs = mysqlTable("llm_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  name: varchar("name", { length: 255 }).notNull(),
  provider: mysqlEnum("provider", ["openai", "anthropic", "custom", "manus"]).notNull(),
  model: varchar("model", { length: 255 }).notNull(),
  apiKey: text("apiKey"),
  apiUrl: text("apiUrl"),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7"),
  maxTokens: int("maxTokens").default(2048),
  topP: decimal("topP", { precision: 3, scale: 2 }).default("1.0"),
  isDefault: boolean("isDefault").default(false),
  status: mysqlEnum("status", ["active", "inactive", "error"]).default("active").notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LLMConfig = typeof llmConfigs.$inferSelect;
export type InsertLLMConfig = typeof llmConfigs.$inferInsert;

// ── Service Integrations ───────────────────────────────────────────────
export const serviceIntegrations = mysqlTable("service_integrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  name: varchar("name", { length: 255 }).notNull(),
  service: mysqlEnum("service", ["slack", "discord", "github", "webhook", "custom"]).notNull(),
  webhookUrl: text("webhookUrl"),
  apiKey: text("apiKey"),
  config: json("config"),
  enabled: boolean("enabled").default(true),
  status: mysqlEnum("status", ["active", "inactive", "error"]).default("active").notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServiceIntegration = typeof serviceIntegrations.$inferSelect;
export type InsertServiceIntegration = typeof serviceIntegrations.$inferInsert;

// -- Webhooks --
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  events: json("events").notNull(), // Array of event types
  secret: varchar("secret", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  retryCount: int("retryCount").default(3).notNull(),
  retryDelayMs: int("retryDelayMs").default(5000).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

// -- Webhook Logs --
export const webhookLogs = mysqlTable("webhookLogs", {
  id: int("id").autoincrement().primaryKey(),
  webhookId: int("webhookId").notNull(),
  event: varchar("event", { length: 64 }).notNull(),
  statusCode: int("statusCode"),
  attempt: int("attempt").default(1).notNull(),
  success: boolean("success").notNull(),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;
