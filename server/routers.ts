import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
import { z } from "zod";
import {
  createAgent, getAgentsByUser, getAgentById, updateAgent, deleteAgent,
  getAllSkills, getSkillById, createSkill, updateSkill,
  getAgentSkills, installSkillToAgent, uninstallSkillFromAgent,
  getMessagesByAgent, createMessage,
  getAuditLogs, createAuditLog,
  getScheduledTasks, getScheduledTaskById, createScheduledTask, updateScheduledTask, deleteScheduledTask,
  getAgentFiles, createAgentFile, deleteAgentFile,
  getIntegrations, createIntegration, updateIntegration, deleteIntegration,
  getDashboardStats,
} from "./db";
import {
  createLLMConfig, getLLMConfig, listLLMConfigs, updateLLMConfig, deleteLLMConfig, testLLMConfig,
  createServiceIntegration, getServiceIntegration, listServiceIntegrations, updateServiceIntegration, deleteServiceIntegration, testServiceIntegration,
} from "./integrations";
import {
  createWebhook, getWebhook, listWebhooks, updateWebhook, deleteWebhook, testWebhook, getWebhookLogs,
} from "./webhooks";
import { nanoid } from "nanoid";
import { integrationRateLimiter, llmRateLimiter, webhookRateLimiter } from "./_core/rateLimit";

// ── Agent Router ───────────────────────────────────────────────────────
const agentRouter = router({
  list: protectedProcedure.query(({ ctx }) => getAgentsByUser(ctx.user.id)),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const agent = await getAgentById(input.id);
      if (!agent || agent.userId !== ctx.user.id) return null;
      return agent;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      systemPrompt: z.string().optional(),
      llmProvider: z.string().optional(),
      mountedDirs: z.any().optional(),
      permissions: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await createAgent({ ...input, userId: ctx.user.id });
      await createAuditLog({
        agentId: result.id, userId: ctx.user.id, action: "agent.created",
        category: "agent", severity: "info", details: { name: input.name },
      });
      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      status: z.enum(["idle", "running", "error", "stopped"]).optional(),
      systemPrompt: z.string().optional(),
      llmProvider: z.string().optional(),
      mountedDirs: z.any().optional(),
      permissions: z.any().optional(),
      config: z.any().optional(),
      memoryEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const agent = await getAgentById(input.id);
      if (!agent || agent.userId !== ctx.user.id) throw new Error("Agent not found");
      const { id, ...data } = input;
      await updateAgent(id, data);
      await createAuditLog({
        agentId: id, userId: ctx.user.id, action: "agent.updated",
        category: "agent", severity: "info", details: data,
      });
      if (input.status === "error") {
        await notifyOwner({ title: `Agent "${agent.name}" Error`, content: `Agent "${agent.name}" has entered an error state.` });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const agent = await getAgentById(input.id);
      if (!agent || agent.userId !== ctx.user.id) throw new Error("Agent not found");
      await deleteAgent(input.id);
      await createAuditLog({
        agentId: input.id, userId: ctx.user.id, action: "agent.deleted",
        category: "agent", severity: "warning", details: { name: agent.name },
      });
    }),

  start: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const agent = await getAgentById(input.id);
      if (!agent || agent.userId !== ctx.user.id) throw new Error("Agent not found");
      await updateAgent(input.id, { status: "running" });
      await createAuditLog({
        agentId: input.id, userId: ctx.user.id, action: "agent.started",
        category: "agent", severity: "info", details: { name: agent.name },
      });
      return { success: true };
    }),

  stop: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const agent = await getAgentById(input.id);
      if (!agent || agent.userId !== ctx.user.id) throw new Error("Agent not found");
      await updateAgent(input.id, { status: "stopped" });
      await createAuditLog({
        agentId: input.id, userId: ctx.user.id, action: "agent.stopped",
        category: "agent", severity: "info", details: { name: agent.name },
      });
      return { success: true };
    }),
});

// ── Skill Router ───────────────────────────────────────────────────────
// MARKETPLACE DISABLED FOR SECURITY AUDIT
const skillRouter = router({
  list: protectedProcedure.query(() => getAllSkills()),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getSkillById(input.id)),

  // DISABLED UNTIL SECURITY AUDIT
  // create: adminProcedure
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      slug: z.string().min(1).max(255),
      description: z.string().optional(),
      version: z.string().optional(),
      author: z.string().optional(),
      category: z.string().optional(),
      isBuiltIn: z.boolean().optional(),
      isVerified: z.boolean().optional(),
      permissions: z.any().optional(),
      config: z.any().optional(),
    }))
    .mutation(async () => {
      throw new Error('Skill marketplace is currently disabled for security audit. Please contact the administrator.');
    }),

  agentSkills: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .query(({ input }) => getAgentSkills(input.agentId)),

  // DISABLED UNTIL SECURITY AUDIT
  install: protectedProcedure
    .input(z.object({ agentId: z.number(), skillId: z.number(), grantedPermissions: z.any().optional() }))
    .mutation(async () => {
      throw new Error('Skill installation is currently disabled for security audit. Please contact the administrator.');
    }),

  // DISABLED UNTIL SECURITY AUDIT
  uninstall: protectedProcedure
    .input(z.object({ agentId: z.number(), skillId: z.number() }))
    .mutation(async () => {
      throw new Error('Skill uninstallation is currently disabled for security audit. Please contact the administrator.');
    }),
});

// ── Chat Router ────────────────────────────────────────────────────────
const chatRouter = router({
  history: protectedProcedure
    .input(z.object({ agentId: z.number(), limit: z.number().optional() }))
    .query(({ input }) => getMessagesByAgent(input.agentId, input.limit)),

  send: protectedProcedure
    .input(z.object({ agentId: z.number(), content: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const agent = await getAgentById(input.agentId);
      if (!agent || agent.userId !== ctx.user.id) throw new Error("Agent not found");

      // Save user message
      await createMessage({ agentId: input.agentId, userId: ctx.user.id, role: "user", content: input.content });

      // Get recent history for context
      const history = await getMessagesByAgent(input.agentId, 20);
      const sortedHistory = history.reverse();

      const llmMessages = [
        { role: "system" as const, content: agent.systemPrompt || "You are a helpful AI agent named " + agent.name + ". You run inside a secure, containerized environment. Be concise and helpful." },
        ...sortedHistory.map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
        { role: "user" as const, content: input.content },
      ];

      try {
        const response = await invokeLLM({ messages: llmMessages });
        const assistantContent = typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : JSON.stringify(response.choices[0]?.message?.content ?? "");

        await createMessage({ agentId: input.agentId, userId: ctx.user.id, role: "assistant", content: assistantContent });

        await createAuditLog({
          agentId: input.agentId, userId: ctx.user.id, action: "chat.message",
          category: "agent", severity: "info", details: { tokens: response.usage },
        });

        return { role: "assistant" as const, content: assistantContent };
      } catch (error: any) {
        await createAuditLog({
          agentId: input.agentId, userId: ctx.user.id, action: "chat.error",
          category: "agent", severity: "error", details: { error: error.message },
        });
        await notifyOwner({ title: `Agent Chat Error`, content: `Agent "${agent.name}" encountered an error: ${error.message}` });
        throw error;
      }
    }),
});

// ── Audit Router ───────────────────────────────────────────────────────
const auditRouter = router({
  list: protectedProcedure
    .input(z.object({
      agentId: z.number().optional(),
      category: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(({ input }) => getAuditLogs(input)),
});

// ── Task Router ────────────────────────────────────────────────────────
const taskRouter = router({
  list: protectedProcedure.query(({ ctx }) => getScheduledTasks(ctx.user.id)),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getScheduledTaskById(input.id)),

  create: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      cronExpression: z.string().optional(),
      intervalSeconds: z.number().optional(),
      taskType: z.enum(["cron", "interval", "once"]),
      prompt: z.string().optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await createScheduledTask({ ...input, userId: ctx.user.id });
      await createAuditLog({
        agentId: input.agentId, userId: ctx.user.id, action: "task.created",
        category: "task", severity: "info", details: { name: input.name },
      });
      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      cronExpression: z.string().optional(),
      intervalSeconds: z.number().optional(),
      prompt: z.string().optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updateScheduledTask(id, data);
      await createAuditLog({
        userId: ctx.user.id, action: "task.updated",
        category: "task", severity: "info", details: { taskId: id },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteScheduledTask(input.id);
      await createAuditLog({
        userId: ctx.user.id, action: "task.deleted",
        category: "task", severity: "warning", details: { taskId: input.id },
      });
    }),
});

// ── Files Router ───────────────────────────────────────────────────────
const fileRouter = router({
  list: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .query(({ input }) => getAgentFiles(input.agentId)),

  upload: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      fileName: z.string(),
      content: z.string(),
      mimeType: z.string().optional(),
      category: z.enum(["artifact", "log", "config", "other"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const fileKey = `agents/${input.agentId}/files/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, input.content, input.mimeType || "text/plain");
      const result = await createAgentFile({
        agentId: input.agentId, userId: ctx.user.id,
        fileName: input.fileName, fileKey, url,
        mimeType: input.mimeType, sizeBytes: Buffer.byteLength(input.content),
        category: input.category || "other",
      });
      await createAuditLog({
        agentId: input.agentId, userId: ctx.user.id, action: "file.uploaded",
        category: "file", severity: "info", details: { fileName: input.fileName },
      });
      return { id: result.id, url };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteAgentFile(input.id);
      await createAuditLog({
        userId: ctx.user.id, action: "file.deleted",
        category: "file", severity: "info", details: { fileId: input.id },
      });
    }),
});

// ── Integration Router ─────────────────────────────────────────────────
const integrationRouter = router({
  list: protectedProcedure.query(({ ctx }) => getIntegrations(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      provider: z.string().min(1),
      label: z.string().optional(),
      scopes: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await createIntegration({ ...input, userId: ctx.user.id });
      await createAuditLog({
        userId: ctx.user.id, action: "integration.created",
        category: "auth", severity: "info", details: { provider: input.provider },
      });
      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["active", "expired", "revoked"]).optional(),
      scopes: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updateIntegration(id, data);
      await createAuditLog({
        userId: ctx.user.id, action: "integration.updated",
        category: "auth", severity: "info", details: { integrationId: id },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteIntegration(input.id);
      await createAuditLog({
        userId: ctx.user.id, action: "integration.revoked",
        category: "auth", severity: "warning", details: { integrationId: input.id },
      });
    }),
});

// ── LLM Configuration Router ───────────────────────────────────────────
const llmRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    const rateLimitCheck = llmRateLimiter(`user:${ctx.user.id}:list`);
    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter}s`);
    }
    return listLLMConfigs(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return getLLMConfig(input.id, ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      provider: z.enum(["openai", "anthropic", "custom"]),
      model: z.string().min(1).max(255),
      apiKey: z.string().optional(),
      apiUrl: z.string().url().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).optional(),
      topP: z.number().min(0).max(1).optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const createData: any = { ...input, userId: ctx.user.id };
      if (input.temperature !== undefined) {
        createData.temperature = input.temperature.toString();
      }
      if (input.topP !== undefined) {
        createData.topP = input.topP.toString();
      }
      const result = await createLLMConfig(createData);
      await createAuditLog({
        userId: ctx.user.id,
        action: "llm.created",
        category: "system",
        severity: "info",
        details: { name: input.name, provider: input.provider },
      });
      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      model: z.string().optional(),
      apiKey: z.string().optional(),
      apiUrl: z.string().url().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      topP: z.number().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      const updateData: any = updates;
      if (updates.temperature !== undefined) {
        updateData.temperature = updates.temperature.toString();
      }
      if (updates.topP !== undefined) {
        updateData.topP = updates.topP.toString();
      }
      const result = await updateLLMConfig(id, ctx.user.id, updateData);
      if (result) {
        await createAuditLog({
          userId: ctx.user.id,
          action: "llm.updated",
          category: "system",
          severity: "info",
          details: { id },
        });
      }
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const success = await deleteLLMConfig(input.id, ctx.user.id);
      if (success) {
        await createAuditLog({
          userId: ctx.user.id,
          action: "llm.deleted",
          category: "system",
          severity: "info",
          details: { id: input.id },
        });
      }
      return success;
    }),

  test: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const rateLimitCheck = llmRateLimiter(`user:${ctx.user.id}:test`);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter}s`);
      }
      return testLLMConfig(input.id, ctx.user.id);
    }),
});

// ── Service Integration Router ─────────────────────────────────────────
const serviceRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    const rateLimitCheck = integrationRateLimiter(`user:${ctx.user.id}:list`);
    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter}s`);
    }
    return listServiceIntegrations(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return getServiceIntegration(input.id, ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      service: z.enum(["slack", "discord", "github", "webhook", "custom"]),
      webhookUrl: z.string().url().optional(),
      apiKey: z.string().optional(),
      config: z.any().optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await createServiceIntegration({ ...input, userId: ctx.user.id });
      await createAuditLog({
        userId: ctx.user.id,
        action: "service.created",
        category: "system",
        severity: "info",
        details: { name: input.name, service: input.service },
      });
      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      webhookUrl: z.string().url().optional(),
      apiKey: z.string().optional(),
      config: z.any().optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      const result = await updateServiceIntegration(id, ctx.user.id, updates);
      if (result) {
        await createAuditLog({
          userId: ctx.user.id,
          action: "service.updated",
          category: "system",
          severity: "info",
          details: { id },
        });
      }
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const success = await deleteServiceIntegration(input.id, ctx.user.id);
      if (success) {
        await createAuditLog({
          userId: ctx.user.id,
          action: "service.deleted",
          category: "system",
          severity: "info",
          details: { id: input.id },
        });
      }
      return success;
    }),

  test: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const rateLimitCheck = integrationRateLimiter(`user:${ctx.user.id}:test`);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter}s`);
      }
      return testServiceIntegration(input.id, ctx.user.id);
    }),
});

// ── Webhook Router ────────────────────────────────────────────────────
const webhookRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    const rateLimitCheck = webhookRateLimiter(`user:${ctx.user.id}:list`);
    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter}s`);
    }
    return listWebhooks(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return getWebhook(input.id, ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      url: z.string().url(),
      events: z.array(z.string()).min(1),
      secret: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const rateLimitCheck = webhookRateLimiter(`user:${ctx.user.id}:create`);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter}s`);
      }
      return createWebhook(ctx.user.id, input.name, input.url, input.events as any, input.secret);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      url: z.string().url().optional(),
      events: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
      secret: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      return updateWebhook(id, ctx.user.id, updates as any);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return deleteWebhook(input.id, ctx.user.id);
    }),

  test: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const rateLimitCheck = webhookRateLimiter(`user:${ctx.user.id}:test`);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter}s`);
      }
      return testWebhook(input.id, ctx.user.id);
    }),

  logs: protectedProcedure
    .input(z.object({ webhookId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      return getWebhookLogs(input.webhookId, ctx.user.id, input.limit);
    }),
});

// ── Dashboard Router ───────────────────────────────────────────────
const dashboardRouter = router({
  stats: protectedProcedure.query(({ ctx }) => getDashboardStats(ctx.user.id)),
});

// ── Main Router ────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  agent: agentRouter,
  skill: skillRouter,
  chat: chatRouter,
  audit: auditRouter,
  task: taskRouter,
  file: fileRouter,
  integration: integrationRouter,
  dashboard: dashboardRouter,
  llm: llmRouter,
  service: serviceRouter,
  webhook: webhookRouter,
});

export type AppRouter = typeof appRouter;
