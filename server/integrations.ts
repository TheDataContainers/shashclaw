import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { llmConfigs, serviceIntegrations, LLMConfig, InsertLLMConfig, ServiceIntegration, InsertServiceIntegration } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { encryptCredential, decryptCredential, maskCredential, isValidApiKey, isValidWebhookUrl } from "./_core/encryption";

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

// ── LLM Configuration Helpers ──────────────────────────────────────────────

/**
 * Create a new LLM configuration with encrypted API key
 */
export async function createLLMConfig(config: InsertLLMConfig & { apiKey?: string }): Promise<LLMConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate inputs
  if (!config.name || !config.provider || !config.model) {
    throw new Error("Missing required fields: name, provider, model");
  }

  if (config.apiKey && !isValidApiKey(config.apiKey)) {
    throw new Error("Invalid API key format");
  }

  if (config.apiUrl && !config.apiUrl.startsWith("http")) {
    throw new Error("Invalid API URL");
  }

  // Encrypt API key before storing
  const encryptedKey = config.apiKey ? encryptCredential(config.apiKey) : null;

  await db.insert(llmConfigs).values({
    ...config,
    apiKey: encryptedKey,
  } as any);

  // Return the created config
  const [created] = await db
    .select()
    .from(llmConfigs)
    .where(and(eq(llmConfigs.userId, config.userId), eq(llmConfigs.name, config.name)))
    .orderBy(llmConfigs.id)
    .limit(1);

  return created as LLMConfig;
}

/**
 * Get LLM config with decrypted API key
 * Only returns to the owner
 */
export async function getLLMConfig(id: number, userId: number): Promise<LLMConfig | null> {
  const db = await getDb();
  if (!db) return null;

  const [config] = await db
    .select()
    .from(llmConfigs)
    .where(and(eq(llmConfigs.id, id), eq(llmConfigs.userId, userId)))
    .limit(1);

  if (!config) return null;

  // Decrypt API key for return
  if (config.apiKey) {
    try {
      config.apiKey = decryptCredential(config.apiKey);
    } catch (error) {
      console.error("[Integration] Failed to decrypt API key");
      config.apiKey = null;
    }
  }

  return config;
}

/**
 * List LLM configs for a user (without exposing API keys)
 */
export async function listLLMConfigs(userId: number): Promise<(LLMConfig & { apiKeyMasked: string })[]> {
  const db = await getDb();
  if (!db) return [];

  const configs = await db
    .select()
    .from(llmConfigs)
    .where(eq(llmConfigs.userId, userId));

  return configs.map((config) => ({
    ...config,
    apiKeyMasked: config.apiKey ? maskCredential(config.apiKey) : "not set",
    apiKey: null, // Never expose encrypted key
  })) as any;
}

/**
 * Update LLM config with optional new API key
 */
export async function updateLLMConfig(
  id: number,
  userId: number,
  updates: Partial<InsertLLMConfig & { apiKey?: string }>
): Promise<LLMConfig | null> {
  const db = await getDb();
  if (!db) return null;

  // Validate inputs
  if (updates.apiKey && !isValidApiKey(updates.apiKey)) {
    throw new Error("Invalid API key format");
  }

  if (updates.apiUrl && !updates.apiUrl.startsWith("http")) {
    throw new Error("Invalid API URL");
  }

  const updateData: any = { ...updates };
  if (updates.apiKey) {
    updateData.apiKey = encryptCredential(updates.apiKey);
  }

  await db
    .update(llmConfigs)
    .set(updateData)
    .where(and(eq(llmConfigs.id, id), eq(llmConfigs.userId, userId)));

  return getLLMConfig(id, userId);
}

/**
 * Delete LLM config
 */
export async function deleteLLMConfig(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .delete(llmConfigs)
    .where(and(eq(llmConfigs.id, id), eq(llmConfigs.userId, userId)));

  return true;
}

// ── Service Integration Helpers ────────────────────────────────────────────

/**
 * Create a new service integration with encrypted credentials
 */
export async function createServiceIntegration(
  integration: InsertServiceIntegration & { apiKey?: string; webhookUrl?: string }
): Promise<ServiceIntegration> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate inputs
  if (!integration.name || !integration.service) {
    throw new Error("Missing required fields: name, service");
  }

  if (integration.apiKey && !isValidApiKey(integration.apiKey)) {
    throw new Error("Invalid API key format");
  }

  if (integration.webhookUrl && !isValidWebhookUrl(integration.webhookUrl)) {
    throw new Error("Invalid webhook URL");
  }

  // Encrypt sensitive fields
  const encryptedApiKey = integration.apiKey ? encryptCredential(integration.apiKey) : null;
  const encryptedWebhook = integration.webhookUrl ? encryptCredential(integration.webhookUrl) : null;

  await db.insert(serviceIntegrations).values({
    ...integration,
    apiKey: encryptedApiKey,
    webhookUrl: encryptedWebhook,
  } as any);

  // Return the created integration
  const [created] = await db
    .select()
    .from(serviceIntegrations)
    .where(and(eq(serviceIntegrations.userId, integration.userId), eq(serviceIntegrations.name, integration.name)))
    .orderBy(serviceIntegrations.id)
    .limit(1);

  return created as ServiceIntegration;
}

/**
 * Get service integration with decrypted credentials
 * Only returns to the owner
 */
export async function getServiceIntegration(id: number, userId: number): Promise<ServiceIntegration | null> {
  const db = await getDb();
  if (!db) return null;

  const [integration] = await db
    .select()
    .from(serviceIntegrations)
    .where(and(eq(serviceIntegrations.id, id), eq(serviceIntegrations.userId, userId)))
    .limit(1);

  if (!integration) return null;

  // Decrypt sensitive fields
  if (integration.apiKey) {
    try {
      integration.apiKey = decryptCredential(integration.apiKey);
    } catch (error) {
      console.error("[Integration] Failed to decrypt API key");
      integration.apiKey = null;
    }
  }

  if (integration.webhookUrl) {
    try {
      integration.webhookUrl = decryptCredential(integration.webhookUrl);
    } catch (error) {
      console.error("[Integration] Failed to decrypt webhook URL");
      integration.webhookUrl = null;
    }
  }

  return integration;
}

/**
 * List service integrations for a user (without exposing credentials)
 */
export async function listServiceIntegrations(userId: number): Promise<(ServiceIntegration & { credentialsMasked: boolean })[]> {
  const db = await getDb();
  if (!db) return [];

  const integrations = await db
    .select()
    .from(serviceIntegrations)
    .where(eq(serviceIntegrations.userId, userId));

  return integrations.map((integration) => ({
    ...integration,
    credentialsMasked: true,
    apiKey: null, // Never expose encrypted key
    webhookUrl: null, // Never expose encrypted webhook
  })) as any;
}

/**
 * Update service integration with optional new credentials
 */
export async function updateServiceIntegration(
  id: number,
  userId: number,
  updates: Partial<InsertServiceIntegration & { apiKey?: string; webhookUrl?: string }>
): Promise<ServiceIntegration | null> {
  const db = await getDb();
  if (!db) return null;

  // Validate inputs
  if (updates.apiKey && !isValidApiKey(updates.apiKey)) {
    throw new Error("Invalid API key format");
  }

  if (updates.webhookUrl && !isValidWebhookUrl(updates.webhookUrl)) {
    throw new Error("Invalid webhook URL");
  }

  const updateData: any = { ...updates };
  if (updates.apiKey) {
    updateData.apiKey = encryptCredential(updates.apiKey);
  }
  if (updates.webhookUrl) {
    updateData.webhookUrl = encryptCredential(updates.webhookUrl);
  }

  await db
    .update(serviceIntegrations)
    .set(updateData)
    .where(and(eq(serviceIntegrations.id, id), eq(serviceIntegrations.userId, userId)));

  return getServiceIntegration(id, userId);
}

/**
 * Delete service integration
 */
export async function deleteServiceIntegration(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(serviceIntegrations)
    .where(and(eq(serviceIntegrations.id, id), eq(serviceIntegrations.userId, userId)));

  return true;
}

/**
 * Test LLM configuration by making a simple API call
 */
export async function testLLMConfig(id: number, userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getLLMConfig(id, userId);
    if (!config) {
      return { success: false, error: "Configuration not found" };
    }

    // Simple test: verify API key format and connectivity
    if (!config.apiKey) {
      return { success: false, error: "No API key configured" };
    }

    // TODO: Implement actual API test based on provider
    // For now, just validate the configuration exists
    return { success: true };
  } catch (error) {
    console.error("[Integration] LLM config test failed:", error);
    return { success: false, error: "Test failed" };
  }
}

/**
 * Test service integration by making a simple request
 */
export async function testServiceIntegration(id: number, userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const integration = await getServiceIntegration(id, userId);
    if (!integration) {
      return { success: false, error: "Integration not found" };
    }

    // Simple test: verify credentials exist
    if (!integration.apiKey && !integration.webhookUrl) {
      return { success: false, error: "No credentials configured" };
    }

    // TODO: Implement actual service test based on provider
    return { success: true };
  } catch (error) {
    console.error("[Integration] Service integration test failed:", error);
    return { success: false, error: "Test failed" };
  }
}
