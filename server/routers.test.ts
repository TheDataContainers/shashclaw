import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock all database functions
vi.mock("./db", () => ({
  createAgent: vi.fn().mockResolvedValue({ id: 1 }),
  getAgentsByUser: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, name: "Test Agent", description: "A test agent", status: "idle", llmProvider: "default", systemPrompt: null, config: null, mountedDirs: null, permissions: null, memoryEnabled: true, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getAgentById: vi.fn().mockResolvedValue(
    { id: 1, userId: 1, name: "Test Agent", description: "A test agent", status: "idle", llmProvider: "default", systemPrompt: "You are helpful.", config: null, mountedDirs: null, permissions: null, memoryEnabled: true, createdAt: new Date(), updatedAt: new Date() }
  ),
  updateAgent: vi.fn().mockResolvedValue(undefined),
  deleteAgent: vi.fn().mockResolvedValue(undefined),
  getAllSkills: vi.fn().mockResolvedValue([
    { id: 1, name: "Web Scraper", slug: "web-scraper", description: "Scrapes web pages", version: "1.0.0", author: "admin", category: "web", isBuiltIn: false, isVerified: true, permissions: null, config: null, installCount: 5, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getSkillById: vi.fn().mockResolvedValue(
    { id: 1, name: "Web Scraper", slug: "web-scraper", description: "Scrapes web pages", version: "1.0.0", author: "admin", category: "web", isBuiltIn: false, isVerified: true, permissions: null, config: null, installCount: 5, createdAt: new Date(), updatedAt: new Date() }
  ),
  createSkill: vi.fn().mockResolvedValue({ id: 1 }),
  updateSkill: vi.fn().mockResolvedValue(undefined),
  getAgentSkills: vi.fn().mockResolvedValue([]),
  installSkillToAgent: vi.fn().mockResolvedValue(undefined),
  uninstallSkillFromAgent: vi.fn().mockResolvedValue(undefined),
  getMessagesByAgent: vi.fn().mockResolvedValue([]),
  createMessage: vi.fn().mockResolvedValue({ id: 1 }),
  getAuditLogs: vi.fn().mockResolvedValue([
    { id: 1, agentId: 1, userId: 1, action: "agent.created", category: "agent", severity: "info", details: { name: "Test" }, ipAddress: null, createdAt: new Date() },
  ]),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  getScheduledTasks: vi.fn().mockResolvedValue([]),
  getScheduledTaskById: vi.fn().mockResolvedValue(
    { id: 1, agentId: 1, userId: 1, name: "Daily Task", description: null, cronExpression: "0 0 9 * * *", intervalSeconds: null, taskType: "cron", prompt: "Run daily", enabled: true, lastRunAt: null, nextRunAt: null, lastStatus: "pending", createdAt: new Date(), updatedAt: new Date() }
  ),
  createScheduledTask: vi.fn().mockResolvedValue({ id: 1 }),
  updateScheduledTask: vi.fn().mockResolvedValue(undefined),
  deleteScheduledTask: vi.fn().mockResolvedValue(undefined),
  getAgentFiles: vi.fn().mockResolvedValue([]),
  createAgentFile: vi.fn().mockResolvedValue({ id: 1 }),
  deleteAgentFile: vi.fn().mockResolvedValue(undefined),
  getIntegrations: vi.fn().mockResolvedValue([]),
  createIntegration: vi.fn().mockResolvedValue({ id: 1 }),
  updateIntegration: vi.fn().mockResolvedValue(undefined),
  deleteIntegration: vi.fn().mockResolvedValue(undefined),
  getDashboardStats: vi.fn().mockResolvedValue({ totalAgents: 2, runningAgents: 1, totalSkills: 5, totalTasks: 3, recentLogs: 10 }),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test-key", url: "https://cdn.example.com/test.txt" }),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "test",
    created: Date.now(),
    model: "test",
    choices: [{ index: 0, message: { role: "assistant", content: "Hello! I'm your AI agent." }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  }),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Dashboard", () => {
  it("returns dashboard stats for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.dashboard.stats();
    expect(stats).toHaveProperty("totalAgents");
    expect(stats).toHaveProperty("runningAgents");
    expect(stats).toHaveProperty("totalSkills");
    expect(stats).toHaveProperty("totalTasks");
    expect(stats).toHaveProperty("recentLogs");
    expect(stats.totalAgents).toBe(2);
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.stats()).rejects.toThrow();
  });
});

describe("Agent CRUD", () => {
  it("lists agents for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const agents = await caller.agent.list();
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0].name).toBe("Test Agent");
  });

  it("creates an agent", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.agent.create({ name: "New Agent", description: "Test description" });
    expect(result).toHaveProperty("id");
    expect(result.id).toBe(1);
  });

  it("gets agent by id", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const agent = await caller.agent.getById({ id: 1 });
    expect(agent).not.toBeNull();
    expect(agent?.name).toBe("Test Agent");
  });

  it("updates an agent", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.agent.update({ id: 1, name: "Updated Agent" })).resolves.not.toThrow();
  });

  it("deletes an agent", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.agent.delete({ id: 1 })).resolves.not.toThrow();
  });

  it("starts an agent", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.agent.start({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("stops an agent", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.agent.stop({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("rejects unauthenticated agent creation", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.agent.create({ name: "Fail" })).rejects.toThrow();
  });
});

describe("Skills", () => {
  it("lists all skills", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const skills = await caller.skill.list();
    expect(Array.isArray(skills)).toBe(true);
    expect(skills.length).toBeGreaterThan(0);
  });

  it("gets skill by id", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const skill = await caller.skill.getById({ id: 1 });
    expect(skill?.name).toBe("Web Scraper");
  });

  it("admin can create skills", async () => {
    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.skill.create({ name: "New Skill", slug: "new-skill" });
    expect(result).toHaveProperty("id");
  });

  it("non-admin cannot create skills", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.skill.create({ name: "Fail", slug: "fail" })).rejects.toThrow();
  });

  it("installs skill to agent", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.skill.install({ agentId: 1, skillId: 1 })).resolves.not.toThrow();
  });

  it("uninstalls skill from agent", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.skill.uninstall({ agentId: 1, skillId: 1 })).resolves.not.toThrow();
  });
});

describe("Chat", () => {
  it("retrieves message history", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const history = await caller.chat.history({ agentId: 1 });
    expect(Array.isArray(history)).toBe(true);
  });

  it("sends a message and gets AI response", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const response = await caller.chat.send({ agentId: 1, content: "Hello" });
    expect(response.role).toBe("assistant");
    expect(response.content).toBe("Hello! I'm your AI agent.");
  });
});

describe("Audit Logs", () => {
  it("lists audit logs", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const logs = await caller.audit.list();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe("agent.created");
  });

  it("filters by category", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const logs = await caller.audit.list({ category: "agent" });
    expect(Array.isArray(logs)).toBe(true);
  });
});

describe("Scheduled Tasks", () => {
  it("lists scheduled tasks", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const tasks = await caller.task.list();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it("creates a scheduled task", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.task.create({
      agentId: 1, name: "Daily Report", taskType: "cron",
      cronExpression: "0 0 9 * * *", prompt: "Generate daily report",
    });
    expect(result).toHaveProperty("id");
  });

  it("updates a scheduled task", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.task.update({ id: 1, enabled: false })).resolves.not.toThrow();
  });

  it("deletes a scheduled task", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.task.delete({ id: 1 })).resolves.not.toThrow();
  });
});

describe("Files", () => {
  it("lists agent files", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const files = await caller.file.list({ agentId: 1 });
    expect(Array.isArray(files)).toBe(true);
  });

  it("uploads a file", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.file.upload({
      agentId: 1, fileName: "test.txt", content: "Hello world",
      mimeType: "text/plain", category: "artifact",
    });
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("url");
  });

  it("deletes a file", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.file.delete({ id: 1 })).resolves.not.toThrow();
  });
});

describe("Integrations", () => {
  it("lists integrations", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const integrations = await caller.integration.list();
    expect(Array.isArray(integrations)).toBe(true);
  });

  it("creates an integration", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integration.create({ provider: "github", label: "My GitHub" });
    expect(result).toHaveProperty("id");
  });

  it("updates an integration", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.integration.update({ id: 1, status: "revoked" })).resolves.not.toThrow();
  });

  it("deletes an integration", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.integration.delete({ id: 1 })).resolves.not.toThrow();
  });
});

describe("Auth", () => {
  it("returns null for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).not.toBeNull();
    expect(me?.name).toBe("Test User");
  });
});
