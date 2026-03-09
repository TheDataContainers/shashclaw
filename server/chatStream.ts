import type { Express, Request, Response } from "express";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { streamInvokeLLM } from "./_core/llm";
import { getLLMConfig } from "./integrations";

const DEMO_LIMIT = 5;

export function registerChatStreamRoute(app: Express) {
  app.post("/api/chat/stream", async (req: Request, res: Response) => {
    // Auth
    let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { agentId, content } = req.body;
    if (!agentId || !content || typeof content !== "string") {
      res.status(400).json({ error: "agentId and content are required" });
      return;
    }

    // Get agent
    const agent = await db.getAgentById(agentId);
    if (!agent || agent.userId !== user.id) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    // Demo check
    const isDemo = user.openId.startsWith("demo:");
    if (isDemo && (user.demoMessageCount ?? 0) >= DEMO_LIMIT) {
      res.status(403).json({ error: "DEMO_LIMIT_REACHED" });
      return;
    }

    // Save user message
    await db.createMessage({ agentId, userId: user.id, role: "user", content });

    // Build messages
    const history = await db.getMessagesByAgent(agentId, 20);
    const sortedHistory = [...history].reverse();
    const llmMessages = [
      { role: "system" as const, content: agent.systemPrompt || `You are a helpful AI agent named ${agent.name}. Be concise and helpful.` },
      ...sortedHistory.map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
      { role: "user" as const, content },
    ];

    // Resolve LLM config
    let llmApiKey: string | undefined;
    let llmModel: string | undefined;

    if (isDemo) {
      llmModel = "claude-haiku-4-5-20251001";
    } else {
      let llmConfig = null;
      if (agent.llmProvider?.startsWith("config:")) {
        const configId = parseInt(agent.llmProvider.slice(7), 10);
        if (!isNaN(configId)) llmConfig = await getLLMConfig(configId, user.id);
      }
      if (!llmConfig) llmConfig = await db.getUserDefaultLLMConfig(user.id);
      if (llmConfig?.apiKey) {
        llmApiKey = llmConfig.apiKey;
        llmModel = llmConfig.model ?? undefined;
      }
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let accumulated = "";
    try {
      for await (const chunk of streamInvokeLLM({ messages: llmMessages, apiKey: llmApiKey, model: llmModel })) {
        accumulated += chunk;
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      // Save assistant message
      await db.createMessage({ agentId, userId: user.id, role: "assistant", content: accumulated });
      if (isDemo) await db.incrementDemoMessageCount(user.id);
      await db.createAuditLog({ agentId, userId: user.id, action: "chat.message", category: "agent", severity: "info", details: {} });

      res.write("data: [DONE]\n\n");
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      await db.createAuditLog({ agentId, userId: user.id, action: "chat.error", category: "agent", severity: "error", details: { error: err.message } });
    } finally {
      res.end();
    }
  });
}
