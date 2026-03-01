/**
 * Webhook system for event-driven automation and external service integration.
 * Supports webhook creation, management, delivery, and retry logic.
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { webhooks, webhookLogs } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import axios from "axios";

export type WebhookEvent = 
  | "agent.created"
  | "agent.updated"
  | "agent.deleted"
  | "agent.started"
  | "agent.completed"
  | "agent.failed"
  | "skill.installed"
  | "skill.uninstalled"
  | "task.scheduled"
  | "task.executed"
  | "task.failed"
  | "integration.tested"
  | "integration.failed";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: Date;
  data: Record<string, any>;
  userId: number;
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  userId: number,
  name: string,
  url: string,
  events: WebhookEvent[],
  secret?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate webhook URL
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid webhook URL");
  }

  // Validate events
  if (!events || events.length === 0) {
    throw new Error("At least one event must be selected");
  }

  const result = await db.insert(webhooks).values({
    userId,
    name,
    url,
    events: JSON.stringify(events),
    secret: secret || undefined,
    isActive: true,
    retryCount: 3,
    retryDelayMs: 5000,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return result;
}

/**
 * Get webhook by ID
 */
export async function getWebhook(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.userId, userId)))
    .limit(1);

  if (result.length === 0) {
    throw new Error("Webhook not found");
  }

  return {
    ...result[0],
    events: JSON.parse(result[0].events as string),
  };
}

/**
 * List webhooks for a user
 */
export async function listWebhooks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.userId, userId));

  return results.map((w) => ({
    ...w,
    events: JSON.parse(w.events as string),
  }));
}

/**
 * Update webhook
 */
export async function updateWebhook(
  id: number,
  userId: number,
  updates: {
    name?: string;
    url?: string;
    events?: WebhookEvent[];
    isActive?: boolean;
    retryCount?: number;
    retryDelayMs?: number;
    secret?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate URL if provided
  if (updates.url) {
    try {
      new URL(updates.url);
    } catch {
      throw new Error("Invalid webhook URL");
    }
  }

  // Validate events if provided
  if (updates.events && updates.events.length === 0) {
    throw new Error("At least one event must be selected");
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (updates.name) updateData.name = updates.name;
  if (updates.url) updateData.url = updates.url;
    if (updates.events) updateData.events = JSON.stringify(updates.events) as any;
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
  if (updates.retryCount !== undefined) updateData.retryCount = updates.retryCount;
  if (updates.retryDelayMs !== undefined) updateData.retryDelayMs = updates.retryDelayMs;
  if (updates.secret !== undefined) updateData.secret = updates.secret || null;

  await db
    .update(webhooks)
    .set(updateData)
    .where(and(eq(webhooks.id, id), eq(webhooks.userId, userId)));

  return getWebhook(id, userId);
}

/**
 * Delete webhook
 */
export async function deleteWebhook(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.userId, userId)));

  return { success: true };
}

/**
 * Deliver webhook payload with retry logic
 */
export async function deliverWebhook(
  webhookId: number,
  payload: WebhookPayload,
  attempt: number = 1
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get webhook
    const result = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, webhookId))
      .limit(1);

    if (result.length === 0) {
      throw new Error("Webhook not found");
    }

    const webhook = result[0];

    // Check if webhook is active
    if (!webhook.isActive) {
      return { success: false, error: "Webhook is inactive" };
    }

    // Check if event is subscribed
    const subscribedEvents = JSON.parse(webhook.events as string);
    if (!subscribedEvents.includes(payload.event)) {
      return { success: false, error: "Event not subscribed" };
    }

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": payload.event,
      "X-Webhook-Timestamp": payload.timestamp.toISOString(),
      "X-Webhook-ID": webhookId.toString(),
    };

    // Add signature if secret is configured
    if (webhook.secret) {
      const crypto = require("crypto");
      const signature = crypto
        .createHmac("sha256", webhook.secret as string)
        .update(JSON.stringify(payload))
        .digest("hex");
      headers["X-Webhook-Signature"] = `sha256=${signature}`;
    }

    // Send webhook
    const response = await axios.post(webhook.url, payload, {
      headers,
      timeout: 30000, // 30 second timeout
    });

    // Log successful delivery
    await db.insert(webhookLogs).values({
      webhookId,
      event: payload.event,
      statusCode: response.status,
      attempt,
      success: true,
      createdAt: new Date(),
    });

    return { success: true, statusCode: response.status };
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    const statusCode = error.response?.status;

    // Log failed delivery
    await db.insert(webhookLogs).values({
      webhookId,
      event: payload.event,
      statusCode: statusCode || 0,
      attempt,
      success: false,
      error: errorMessage,
      createdAt: new Date(),
    });

    // Retry logic
    const webhook = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, webhookId))
      .limit(1);

    if (webhook.length > 0 && attempt < webhook[0].retryCount) {
      const delay = webhook[0].retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
      setTimeout(() => {
        deliverWebhook(webhookId, payload, attempt + 1);
      }, delay);

      return { success: false, statusCode, error: `Retry scheduled in ${delay}ms` };
    }

    // All retries exhausted - notify owner
    if (attempt >= (webhook[0]?.retryCount || 3)) {
      await notifyOwner({
        title: "Webhook Delivery Failed",
        content: `Webhook ${webhookId} failed to deliver event "${payload.event}" after ${attempt} attempts. Error: ${errorMessage}`,
      });
    }

    return { success: false, statusCode, error: errorMessage };
  }
}

/**
 * Trigger webhook for an event
 */
export async function triggerWebhook(
  userId: number,
  event: WebhookEvent,
  data: Record<string, any>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all active webhooks for this user that subscribe to this event
  const userWebhooks = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.userId, userId));

  const payload: WebhookPayload = {
    event,
    timestamp: new Date(),
    data,
    userId,
  };

  // Deliver to all matching webhooks
  const results = [];
  for (const webhook of userWebhooks) {
    const events = JSON.parse(webhook.events as string);
    if (events.includes(event)) {
      const result = await deliverWebhook(webhook.id, payload);
      results.push(result);
    }
  }

  return results;
}

/**
 * Get webhook logs
 */
export async function getWebhookLogs(webhookId: number, userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify webhook belongs to user
  const webhook = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId)))
    .limit(1);

  if (webhook.length === 0) {
    throw new Error("Webhook not found");
  }

  // Get logs
  const logs = await db
    .select()
    .from(webhookLogs)
    .where(eq(webhookLogs.webhookId, webhookId))
    .orderBy((t: any) => t.createdAt)
    .limit(limit);

  return logs;
}

/**
 * Test webhook delivery
 */
export async function testWebhook(webhookId: number, userId: number) {
  const webhook = await getWebhook(webhookId, userId);

  const testPayload: WebhookPayload = {
    event: "integration.tested",
    timestamp: new Date(),
    data: {
      message: "This is a test webhook delivery",
      webhookId,
    },
    userId,
  };

  return deliverWebhook(webhookId, testPayload);
}
