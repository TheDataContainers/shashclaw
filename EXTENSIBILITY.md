# Shashclaw Extensibility Guide

This guide explains how to make Shashclaw work outside the Manus platform and how to extend it for custom use cases.

## Table of Contents

1. [Decoupling from Manus](#decoupling-from-manus)
2. [External Hosting Setup](#external-hosting-setup)
3. [Custom Authentication](#custom-authentication)
4. [Custom LLM Providers](#custom-llm-providers)
5. [Custom Storage Backends](#custom-storage-backends)
6. [Plugin Architecture](#plugin-architecture)
7. [Container Runtime Integration](#container-runtime-integration)
8. [Notification Systems](#notification-systems)
9. [Database Flexibility](#database-flexibility)

---

## Decoupling from Manus

### Current Manus Dependencies

Shashclaw currently depends on Manus for:

1. **OAuth Authentication** (`server/_core/oauth.ts`, `server/_core/sdk.ts`)
2. **LLM Integration** (`server/_core/llm.ts`)
3. **File Storage** (`server/storage.ts`)
4. **Notifications** (`server/_core/notification.ts`)
5. **Analytics** (frontend tracking)

### Abstraction Strategy

Create abstraction layers for each dependency:

```typescript
// server/_core/providers/auth.ts
export interface AuthProvider {
  authenticate(token: string): Promise<User | null>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string }>;
  revokeToken(token: string): Promise<void>;
}

// server/_core/providers/llm.ts
export interface LLMProvider {
  invoke(params: LLMInvokeParams): Promise<LLMResponse>;
  listModels(): Promise<string[]>;
}

// server/_core/providers/storage.ts
export interface StorageProvider {
  put(key: string, data: Buffer, contentType?: string): Promise<{ url: string; key: string }>;
  get(key: string, expiresIn?: number): Promise<{ url: string; key: string }>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

// server/_core/providers/notification.ts
export interface NotificationProvider {
  send(notification: Notification): Promise<boolean>;
  sendBatch(notifications: Notification[]): Promise<boolean[]>;
}
```

---

## External Hosting Setup

### Option 1: Docker Deployment

Create a `Dockerfile` for containerized deployment:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend and backend
RUN pnpm build

# Expose port
EXPOSE 3000

# Start server
CMD ["pnpm", "start"]
```

Create a `docker-compose.yml` for local development:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: mysql://user:password@db:3306/shashclaw
      JWT_SECRET: ${JWT_SECRET}
      AUTH_PROVIDER: custom
      LLM_PROVIDER: openai
      STORAGE_PROVIDER: s3
    depends_on:
      - db
      - redis

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: shashclaw
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  db_data:
```

### Option 2: Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shashclaw
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shashclaw
  template:
    metadata:
      labels:
        app: shashclaw
    spec:
      containers:
      - name: shashclaw
        image: your-registry/shashclaw:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: shashclaw-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: shashclaw-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: shashclaw-service
spec:
  selector:
    app: shashclaw
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Option 3: Railway/Render/Vercel

These platforms support Node.js applications directly:

**Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway up
```

**Render:**
- Connect GitHub repository
- Set environment variables in Render dashboard
- Deploy with `pnpm build && pnpm start`

**Vercel (Frontend only):**
- Deploy frontend to Vercel
- Deploy backend separately (Railway, Render, AWS Lambda)
- Update `VITE_FRONTEND_FORGE_API_URL` to point to your backend

---

## Custom Authentication

### Replace Manus OAuth with Custom Auth

Create `server/_core/providers/auth-custom.ts`:

```typescript
import { AuthProvider } from './types';
import type { User } from '../../drizzle/schema';

export class CustomAuthProvider implements AuthProvider {
  async authenticate(token: string): Promise<User | null> {
    // Implement your own token validation
    // Examples: JWT, API keys, session tokens, LDAP, SAML
    
    try {
      const decoded = this.verifyJWT(token);
      return await this.getUserFromDatabase(decoded.sub);
    } catch (error) {
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    // Implement token refresh logic
    const decoded = this.verifyJWT(refreshToken);
    return {
      accessToken: this.generateJWT(decoded.sub)
    };
  }

  async revokeToken(token: string): Promise<void> {
    // Add token to blacklist or revoke in your system
  }

  private verifyJWT(token: string) {
    // Use jsonwebtoken or similar library
    // const jwt = require('jsonwebtoken');
    // return jwt.verify(token, process.env.JWT_SECRET);
    throw new Error('Implement JWT verification');
  }

  private generateJWT(userId: string) {
    // Generate new JWT token
    throw new Error('Implement JWT generation');
  }

  private async getUserFromDatabase(userId: string): Promise<User | null> {
    // Query your database
    throw new Error('Implement user lookup');
  }
}
```

### Support Multiple Auth Methods

```typescript
// server/_core/auth-factory.ts
export function createAuthProvider(): AuthProvider {
  const provider = process.env.AUTH_PROVIDER || 'manus';

  switch (provider) {
    case 'custom':
      return new CustomAuthProvider();
    case 'auth0':
      return new Auth0Provider();
    case 'keycloak':
      return new KeycloakProvider();
    case 'ldap':
      return new LDAPProvider();
    case 'manus':
    default:
      return new ManusAuthProvider();
  }
}
```

### Example: Auth0 Integration

```typescript
import { ManagementClient } from 'auth0';

export class Auth0Provider implements AuthProvider {
  private client: ManagementClient;

  constructor() {
    this.client = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN!,
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
    });
  }

  async authenticate(token: string): Promise<User | null> {
    try {
      const userInfo = await this.client.users.get({ id: token });
      return {
        id: userInfo.user_id,
        openId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        role: 'user',
        // ... other fields
      };
    } catch (error) {
      return null;
    }
  }
}
```

---

## Custom LLM Providers

### Abstract LLM Interface

Create `server/_core/providers/llm-types.ts`:

```typescript
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: string; [key: string]: any }>;
}

export interface LLMInvokeParams {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  tools?: any[];
  tool_choice?: string;
  response_format?: { type: 'json_schema'; json_schema: any };
}

export interface LLMResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMProvider {
  invoke(params: LLMInvokeParams): Promise<LLMResponse>;
  listModels(): Promise<string[]>;
  getModelInfo(model: string): Promise<{ maxTokens: number; costPer1kTokens: number }>;
}
```

### Implement Custom Providers

```typescript
// OpenAI Provider
import OpenAI from 'openai';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async invoke(params: LLMInvokeParams): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: params.model || 'gpt-4',
      messages: params.messages as any,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      tools: params.tools,
    });

    return {
      id: response.id,
      model: response.model,
      choices: response.choices.map(c => ({
        index: c.index,
        message: c.message,
        finish_reason: c.finish_reason,
      })),
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async listModels(): Promise<string[]> {
    return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  }

  async getModelInfo(model: string) {
    const info: Record<string, any> = {
      'gpt-4': { maxTokens: 8192, costPer1kTokens: 0.03 },
      'gpt-4-turbo': { maxTokens: 128000, costPer1kTokens: 0.01 },
      'gpt-3.5-turbo': { maxTokens: 4096, costPer1kTokens: 0.0005 },
    };
    return info[model] || { maxTokens: 4096, costPer1kTokens: 0.001 };
  }
}

// Anthropic Provider
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async invoke(params: LLMInvokeParams): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: params.model || 'claude-3-opus-20240229',
      max_tokens: params.max_tokens || 1024,
      messages: params.messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
    });

    return {
      id: response.id,
      model: response.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: response.content[0].type === 'text' ? response.content[0].text : '',
        },
        finish_reason: response.stop_reason,
      }],
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async listModels(): Promise<string[]> {
    return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
  }

  async getModelInfo(model: string) {
    const info: Record<string, any> = {
      'claude-3-opus-20240229': { maxTokens: 200000, costPer1kTokens: 0.015 },
      'claude-3-sonnet-20240229': { maxTokens: 200000, costPer1kTokens: 0.003 },
      'claude-3-haiku-20240307': { maxTokens: 200000, costPer1kTokens: 0.00025 },
    };
    return info[model] || { maxTokens: 200000, costPer1kTokens: 0.001 };
  }
}

// Local LLM Provider (Ollama, LLaMA.cpp)
export class LocalLLMProvider implements LLMProvider {
  constructor(private baseUrl: string = 'http://localhost:11434') {}

  async invoke(params: LLMInvokeParams): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model || 'llama2',
        messages: params.messages,
        stream: false,
      }),
    });

    const data = await response.json();
    return {
      id: 'local-' + Date.now(),
      model: params.model || 'llama2',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: data.message.content },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    const data = await response.json();
    return data.models.map((m: any) => m.name);
  }

  async getModelInfo(model: string) {
    return { maxTokens: 4096, costPer1kTokens: 0 };
  }
}
```

### LLM Provider Factory

```typescript
// server/_core/llm-factory.ts
export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'openai';

  switch (provider) {
    case 'openai':
      return new OpenAIProvider(process.env.OPENAI_API_KEY!);
    case 'anthropic':
      return new AnthropicProvider(process.env.ANTHROPIC_API_KEY!);
    case 'local':
      return new LocalLLMProvider(process.env.LOCAL_LLM_URL);
    case 'manus':
    default:
      return new ManusLLMProvider();
  }
}
```

---

## Custom Storage Backends

### Abstract Storage Interface

```typescript
// server/_core/providers/storage-types.ts
export interface StorageProvider {
  put(key: string, data: Buffer | string, contentType?: string): Promise<{ url: string; key: string }>;
  get(key: string, expiresIn?: number): Promise<{ url: string; key: string }>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  exists(key: string): Promise<boolean>;
}
```

### Implement Storage Providers

```typescript
// AWS S3
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({ region: process.env.AWS_REGION });
    this.bucket = process.env.S3_BUCKET!;
  }

  async put(key: string, data: Buffer | string, contentType?: string) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    }));

    const url = await getSignedUrl(this.client, new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }), { expiresIn: 3600 });

    return { url, key };
  }

  async get(key: string, expiresIn: number = 3600) {
    const url = await getSignedUrl(this.client, new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }), { expiresIn });

    return { url, key };
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  async list(prefix: string): Promise<string[]> {
    const response = await this.client.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    }));
    return (response.Contents || []).map(obj => obj.Key!);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return true;
    } catch {
      return false;
    }
  }
}

// Google Cloud Storage
import { Storage } from '@google-cloud/storage';

export class GCSStorageProvider implements StorageProvider {
  private storage: Storage;
  private bucket: any;

  constructor() {
    this.storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCP_KEY_FILE,
    });
    this.bucket = this.storage.bucket(process.env.GCS_BUCKET!);
  }

  async put(key: string, data: Buffer | string, contentType?: string) {
    const file = this.bucket.file(key);
    await file.save(data, { metadata: { contentType } });
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 3600 * 1000,
    });
    return { url, key };
  }

  async get(key: string, expiresIn: number = 3600) {
    const file = this.bucket.file(key);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });
    return { url, key };
  }

  async delete(key: string) {
    await this.bucket.file(key).delete();
  }

  async list(prefix: string): Promise<string[]> {
    const [files] = await this.bucket.getFiles({ prefix });
    return files.map(f => f.name);
  }

  async exists(key: string): Promise<boolean> {
    const [exists] = await this.bucket.file(key).exists();
    return exists;
  }
}

// Local Filesystem (for development)
import * as fs from 'fs/promises';
import * as path from 'path';

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor(basePath: string = './uploads', baseUrl: string = 'http://localhost:3000/uploads') {
    this.basePath = basePath;
    this.baseUrl = baseUrl;
  }

  async put(key: string, data: Buffer | string) {
    const filePath = path.join(this.basePath, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return {
      url: `${this.baseUrl}/${key}`,
      key,
    };
  }

  async get(key: string) {
    return {
      url: `${this.baseUrl}/${key}`,
      key,
    };
  }

  async delete(key: string) {
    const filePath = path.join(this.basePath, key);
    await fs.unlink(filePath);
  }

  async list(prefix: string): Promise<string[]> {
    const dirPath = path.join(this.basePath, prefix);
    try {
      const files = await fs.readdir(dirPath, { recursive: true });
      return files.map(f => path.join(prefix, String(f)));
    } catch {
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.basePath, key));
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## Plugin Architecture

### Create a Plugin System

```typescript
// server/_core/plugins/types.ts
export interface Plugin {
  name: string;
  version: string;
  hooks: {
    onAgentCreated?: (agent: Agent) => Promise<void>;
    onAgentStarted?: (agent: Agent) => Promise<void>;
    onAgentStopped?: (agent: Agent) => Promise<void>;
    onMessageReceived?: (message: Message) => Promise<void>;
    onSkillInstalled?: (agentId: number, skillId: number) => Promise<void>;
    onTaskExecuted?: (task: ScheduledTask) => Promise<void>;
  };
  commands?: {
    [commandName: string]: (args: any) => Promise<any>;
  };
}

export interface PluginContext {
  db: Database;
  config: Config;
  logger: Logger;
  emit: (event: string, data: any) => void;
}
```

### Plugin Manager

```typescript
// server/_core/plugins/manager.ts
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async loadPlugin(pluginPath: string) {
    const plugin = await import(pluginPath);
    this.plugins.set(plugin.default.name, plugin.default);
  }

  async executeHook(hookName: string, data: any) {
    for (const plugin of this.plugins.values()) {
      const hook = (plugin.hooks as any)[hookName];
      if (hook) {
        try {
          await hook.call(plugin, data);
        } catch (error) {
          console.error(`Plugin ${plugin.name} hook ${hookName} failed:`, error);
        }
      }
    }
  }

  async executeCommand(commandName: string, args: any) {
    for (const plugin of this.plugins.values()) {
      const command = plugin.commands?.[commandName];
      if (command) {
        return await command.call(plugin, args);
      }
    }
    throw new Error(`Command ${commandName} not found`);
  }
}
```

### Example Plugin

```typescript
// plugins/slack-notifications.ts
import { Plugin } from '../server/_core/plugins/types';
import { WebClient } from '@slack/web-api';

const slackPlugin: Plugin = {
  name: 'slack-notifications',
  version: '1.0.0',
  hooks: {
    async onAgentCreated(agent) {
      const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
      await slack.chat.postMessage({
        channel: process.env.SLACK_CHANNEL!,
        text: `New agent created: ${agent.name}`,
      });
    },
    async onTaskExecuted(task) {
      const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
      await slack.chat.postMessage({
        channel: process.env.SLACK_CHANNEL!,
        text: `Task executed: ${task.name} - Status: ${task.lastStatus}`,
      });
    },
  },
};

export default slackPlugin;
```

---

## Container Runtime Integration

### Support Multiple Container Runtimes

```typescript
// server/_core/container/types.ts
export interface ContainerRuntime {
  createContainer(config: ContainerConfig): Promise<Container>;
  startContainer(id: string): Promise<void>;
  stopContainer(id: string): Promise<void>;
  executeCommand(id: string, command: string[]): Promise<ExecResult>;
  getContainerLogs(id: string): Promise<string>;
  deleteContainer(id: string): Promise<void>;
}

export interface ContainerConfig {
  image: string;
  name: string;
  env: Record<string, string>;
  mounts: Array<{ source: string; target: string; readOnly?: boolean }>;
  resources?: {
    cpuLimit?: string;
    memoryLimit?: string;
  };
}

export interface Container {
  id: string;
  name: string;
  status: 'created' | 'running' | 'stopped' | 'error';
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

### Docker Implementation

```typescript
// server/_core/container/docker.ts
import Docker from 'dockerode';

export class DockerRuntime implements ContainerRuntime {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  async createContainer(config: ContainerConfig): Promise<Container> {
    const container = await this.docker.createContainer({
      Image: config.image,
      name: config.name,
      Env: Object.entries(config.env).map(([k, v]) => `${k}=${v}`),
      HostConfig: {
        Binds: config.mounts.map(m => `${m.source}:${m.target}${m.readOnly ? ':ro' : ''}`),
        Memory: config.resources?.memoryLimit ? parseInt(config.resources.memoryLimit) : undefined,
        CpuQuota: config.resources?.cpuLimit ? parseInt(config.resources.cpuLimit) : undefined,
      },
    });

    return {
      id: container.id,
      name: config.name,
      status: 'created',
    };
  }

  async startContainer(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.start();
  }

  async stopContainer(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.stop();
  }

  async executeCommand(id: string, command: string[]): Promise<ExecResult> {
    const container = this.docker.getContainer(id);
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ Detach: false });
    const output = await new Promise<Buffer>((resolve, reject) => {
      let data = Buffer.alloc(0);
      stream.on('data', chunk => { data = Buffer.concat([data, chunk]); });
      stream.on('end', () => resolve(data));
      stream.on('error', reject);
    });

    return {
      stdout: output.toString(),
      stderr: '',
      exitCode: 0,
    };
  }

  async getContainerLogs(id: string): Promise<string> {
    const container = this.docker.getContainer(id);
    const logs = await container.logs({ stdout: true, stderr: true });
    return logs.toString();
  }

  async deleteContainer(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.remove();
  }
}
```

### Podman Implementation

```typescript
// server/_core/container/podman.ts
import { execSync } from 'child_process';

export class PodmanRuntime implements ContainerRuntime {
  async createContainer(config: ContainerConfig): Promise<Container> {
    const mounts = config.mounts
      .map(m => `-v ${m.source}:${m.target}${m.readOnly ? ':ro' : ''}`)
      .join(' ');

    const env = Object.entries(config.env)
      .map(([k, v]) => `-e ${k}=${v}`)
      .join(' ');

    const cmd = `podman create --name ${config.name} ${mounts} ${env} ${config.image}`;
    const id = execSync(cmd).toString().trim();

    return { id, name: config.name, status: 'created' };
  }

  async startContainer(id: string): Promise<void> {
    execSync(`podman start ${id}`);
  }

  async stopContainer(id: string): Promise<void> {
    execSync(`podman stop ${id}`);
  }

  async executeCommand(id: string, command: string[]): Promise<ExecResult> {
    try {
      const stdout = execSync(`podman exec ${id} ${command.join(' ')}`).toString();
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error: any) {
      return { stdout: '', stderr: error.message, exitCode: error.status };
    }
  }

  async getContainerLogs(id: string): Promise<string> {
    return execSync(`podman logs ${id}`).toString();
  }

  async deleteContainer(id: string): Promise<void> {
    execSync(`podman rm ${id}`);
  }
}
```

---

## Notification Systems

### Abstract Notification Interface

```typescript
// server/_core/providers/notification-types.ts
export interface Notification {
  title: string;
  content: string;
  severity: 'critical' | 'warning' | 'info';
  recipient?: string;
  metadata?: Record<string, any>;
}

export interface NotificationProvider {
  send(notification: Notification): Promise<boolean>;
  sendBatch(notifications: Notification[]): Promise<boolean[]>;
}
```

### Implement Notification Providers

```typescript
// Email
import nodemailer from 'nodemailer';

export class EmailNotificationProvider implements NotificationProvider {
  private transporter: any;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(notification: Notification): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: notification.recipient || process.env.OWNER_EMAIL,
        subject: notification.title,
        html: notification.content,
      });
      return true;
    } catch (error) {
      console.error('Email notification failed:', error);
      return false;
    }
  }

  async sendBatch(notifications: Notification[]): Promise<boolean[]> {
    return Promise.all(notifications.map(n => this.send(n)));
  }
}

// Slack
import { WebClient } from '@slack/web-api';

export class SlackNotificationProvider implements NotificationProvider {
  private client: WebClient;

  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  async send(notification: Notification): Promise<boolean> {
    try {
      await this.client.chat.postMessage({
        channel: process.env.SLACK_CHANNEL!,
        text: notification.title,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${notification.title}*\n${notification.content}`,
            },
          },
        ],
      });
      return true;
    } catch (error) {
      console.error('Slack notification failed:', error);
      return false;
    }
  }

  async sendBatch(notifications: Notification[]): Promise<boolean[]> {
    return Promise.all(notifications.map(n => this.send(n)));
  }
}

// Discord
import { EmbedBuilder, WebhookClient } from 'discord.js';

export class DiscordNotificationProvider implements NotificationProvider {
  private webhook: WebhookClient;

  constructor() {
    const [id, token] = process.env.DISCORD_WEBHOOK_URL!.split('/').slice(-2);
    this.webhook = new WebhookClient({ id, token });
  }

  async send(notification: Notification): Promise<boolean> {
    try {
      const embed = new EmbedBuilder()
        .setTitle(notification.title)
        .setDescription(notification.content)
        .setColor(
          notification.severity === 'critical' ? 0xFF0000 :
          notification.severity === 'warning' ? 0xFFFF00 :
          0x00FF00
        );

      await this.webhook.send({ embeds: [embed] });
      return true;
    } catch (error) {
      console.error('Discord notification failed:', error);
      return false;
    }
  }

  async sendBatch(notifications: Notification[]): Promise<boolean[]> {
    return Promise.all(notifications.map(n => this.send(n)));
  }
}
```

---

## Database Flexibility

### Support Multiple Databases

Currently using MySQL/TiDB via Drizzle ORM. Drizzle supports:

- **MySQL** — `mysql2` driver
- **PostgreSQL** — `pg` or `postgres.js` driver
- **SQLite** — `better-sqlite3` or `sql.js` driver

### Switch Database

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

const driver = process.env.DB_DRIVER || 'mysql';

const config: Config = {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: driver as 'mysql' | 'postgresql' | 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};

export default config;
```

### Example: PostgreSQL Setup

```bash
# Install PostgreSQL driver
pnpm add pg

# Set environment
export DATABASE_URL="postgresql://user:password@localhost:5432/shashclaw"
export DB_DRIVER="postgresql"

# Run migrations
pnpm db:push
```

---

## Environment Configuration Template

Create `.env.example` for external deployments:

```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/shashclaw
DB_DRIVER=mysql

# Authentication
AUTH_PROVIDER=custom
JWT_SECRET=your-secret-key-here

# LLM
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
# OR
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-...
# OR
# LLM_PROVIDER=local
# LOCAL_LLM_URL=http://localhost:11434

# Storage
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=shashclaw-files
# OR
# STORAGE_PROVIDER=gcs
# GCP_PROJECT_ID=...
# GCS_BUCKET=...
# OR
# STORAGE_PROVIDER=local
# LOCAL_STORAGE_PATH=./uploads

# Notifications
NOTIFICATION_PROVIDER=email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@shashclaw.com
OWNER_EMAIL=admin@example.com
# OR
# NOTIFICATION_PROVIDER=slack
# SLACK_BOT_TOKEN=xoxb-...
# SLACK_CHANNEL=#alerts

# Container Runtime
CONTAINER_RUNTIME=docker
# OR
# CONTAINER_RUNTIME=podman

# Optional: Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=...
```

---

## Deployment Checklist

- [ ] Replace Manus OAuth with custom auth provider
- [ ] Configure LLM provider (OpenAI, Anthropic, or local)
- [ ] Set up storage backend (S3, GCS, or local)
- [ ] Configure notification system (Email, Slack, Discord)
- [ ] Set up database (MySQL, PostgreSQL, or SQLite)
- [ ] Configure container runtime (Docker or Podman)
- [ ] Set all environment variables
- [ ] Run database migrations (`pnpm db:push`)
- [ ] Build application (`pnpm build`)
- [ ] Start server (`pnpm start`)
- [ ] Test authentication flow
- [ ] Test agent creation and execution
- [ ] Verify file storage and retrieval
- [ ] Test notifications

---

## Support for Custom Extensions

### Adding Custom Routers

Create `server/routers/custom.ts`:

```typescript
import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';

export const customRouter = router({
  myFeature: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Your custom logic here
      return { success: true };
    }),
});
```

Register in `server/routers.ts`:

```typescript
import { customRouter } from './routers/custom';

export const appRouter = router({
  // ... existing routers
  custom: customRouter,
});
```

### Adding Custom Pages

Create `client/src/pages/CustomPage.tsx` and register in `client/src/App.tsx`:

```typescript
import { Route } from 'wouter';
import CustomPage from './pages/CustomPage';

<Route path="/custom" component={CustomPage} />
```

---

## Conclusion

Shashclaw is designed to be extensible at every layer:

- **Authentication** — Swap Manus OAuth for Auth0, Keycloak, LDAP, or custom
- **LLM** — Use OpenAI, Anthropic, local models, or custom implementations
- **Storage** — Use S3, GCS, local filesystem, or custom backends
- **Notifications** — Email, Slack, Discord, or custom providers
- **Container Runtime** — Docker, Podman, or custom runtimes
- **Database** — MySQL, PostgreSQL, SQLite, or others via Drizzle
- **Plugins** — Extend functionality with a plugin system
- **Custom Features** — Add routers and pages as needed

This makes Shashclaw suitable for deployment in any environment, from local development to enterprise cloud infrastructure.
