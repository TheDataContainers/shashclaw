import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  agents, InsertAgent, Agent,
  skills, InsertSkill, Skill,
  agentSkills, InsertAgentSkill,
  messages, InsertMessage,
  auditLogs, InsertAuditLog,
  scheduledTasks, InsertScheduledTask,
  agentFiles, InsertAgentFile,
  integrations, InsertIntegration,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Users ──────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Agents ─────────────────────────────────────────────────────────────
export async function createAgent(data: InsertAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agents).values(data);
  return { id: result[0].insertId };
}

export async function getAgentsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agents).where(eq(agents.userId, userId)).orderBy(desc(agents.updatedAt));
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result[0];
}

export async function updateAgent(id: number, data: Partial<InsertAgent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(agents).set(data).where(eq(agents.id, id));
}

export async function deleteAgent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(agents).where(eq(agents.id, id));
}

// ── Skills ─────────────────────────────────────────────────────────────
export async function getAllSkills() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skills).orderBy(desc(skills.updatedAt));
}

export async function getSkillById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(skills).where(eq(skills.id, id)).limit(1);
  return result[0];
}

export async function createSkill(data: InsertSkill) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(skills).values(data);
  return { id: result[0].insertId };
}

export async function updateSkill(id: number, data: Partial<InsertSkill>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(skills).set(data).where(eq(skills.id, id));
}

// ── Agent Skills ───────────────────────────────────────────────────────
export async function getAgentSkills(agentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    agentSkill: agentSkills,
    skill: skills,
  }).from(agentSkills)
    .innerJoin(skills, eq(agentSkills.skillId, skills.id))
    .where(eq(agentSkills.agentId, agentId));
}

export async function installSkillToAgent(data: InsertAgentSkill) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(agentSkills).values(data);
  await db.update(skills).set({ installCount: sql`${skills.installCount} + 1` }).where(eq(skills.id, data.skillId));
}

export async function uninstallSkillFromAgent(agentId: number, skillId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(agentSkills).where(and(eq(agentSkills.agentId, agentId), eq(agentSkills.skillId, skillId)));
}

// ── Messages ───────────────────────────────────────────────────────────
export async function getMessagesByAgent(agentId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.agentId, agentId)).orderBy(desc(messages.createdAt)).limit(limit);
}

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values(data);
  return { id: result[0].insertId };
}

// ── Audit Logs ─────────────────────────────────────────────────────────
export async function getAuditLogs(filters?: { agentId?: number; category?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.agentId) conditions.push(eq(auditLogs.agentId, filters.agentId));
  if (filters?.category) conditions.push(eq(auditLogs.category, filters.category as any));
  const query = conditions.length > 0
    ? db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt)).limit(filters?.limit ?? 100)
    : db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(filters?.limit ?? 100);
  return query;
}

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) { console.warn("[AuditLog] Database not available"); return; }
  await db.insert(auditLogs).values(data);
}

// ── Scheduled Tasks ────────────────────────────────────────────────────
export async function getScheduledTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scheduledTasks).where(eq(scheduledTasks.userId, userId)).orderBy(desc(scheduledTasks.updatedAt));
}

export async function getScheduledTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, id)).limit(1);
  return result[0];
}

export async function createScheduledTask(data: InsertScheduledTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scheduledTasks).values(data);
  return { id: result[0].insertId };
}

export async function updateScheduledTask(id: number, data: Partial<InsertScheduledTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scheduledTasks).set(data).where(eq(scheduledTasks.id, id));
}

export async function deleteScheduledTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(scheduledTasks).where(eq(scheduledTasks.id, id));
}

// ── Agent Files ────────────────────────────────────────────────────────
export async function getAgentFiles(agentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentFiles).where(eq(agentFiles.agentId, agentId)).orderBy(desc(agentFiles.createdAt));
}

export async function createAgentFile(data: InsertAgentFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agentFiles).values(data);
  return { id: result[0].insertId };
}

export async function deleteAgentFile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(agentFiles).where(eq(agentFiles.id, id));
}

// ── Integrations ───────────────────────────────────────────────────────
export async function getIntegrations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(integrations).where(eq(integrations.userId, userId)).orderBy(desc(integrations.updatedAt));
}

export async function createIntegration(data: InsertIntegration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(integrations).values(data);
  return { id: result[0].insertId };
}

export async function updateIntegration(id: number, data: Partial<InsertIntegration>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(integrations).set(data).where(eq(integrations.id, id));
}

export async function deleteIntegration(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(integrations).where(eq(integrations.id, id));
}

// ── Dashboard Stats ────────────────────────────────────────────────────
export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalAgents: 0, runningAgents: 0, totalSkills: 0, totalTasks: 0, recentLogs: 0 };
  const [agentCount] = await db.select({ count: sql<number>`count(*)` }).from(agents).where(eq(agents.userId, userId));
  const [runningCount] = await db.select({ count: sql<number>`count(*)` }).from(agents).where(and(eq(agents.userId, userId), eq(agents.status, "running")));
  const [skillCount] = await db.select({ count: sql<number>`count(*)` }).from(skills);
  const [taskCount] = await db.select({ count: sql<number>`count(*)` }).from(scheduledTasks).where(eq(scheduledTasks.userId, userId));
  const [logCount] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(eq(auditLogs.userId, userId));
  return {
    totalAgents: agentCount?.count ?? 0,
    runningAgents: runningCount?.count ?? 0,
    totalSkills: skillCount?.count ?? 0,
    totalTasks: taskCount?.count ?? 0,
    recentLogs: logCount?.count ?? 0,
  };
}
