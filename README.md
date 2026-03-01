# Shashclaw — Secure AI Agent Execution Platform

A production-ready platform for deploying, managing, and monitoring AI agents with enterprise-grade security, inspired by OpenClaw's functionality and NanoClaw's security principles.

## Overview

Shashclaw enables you to:

- **Deploy AI agents** in isolated container environments with explicit directory mounting and sandboxed execution
- **Manage agent skills** with a marketplace registry and permission-based access controls
- **Monitor agent activity** in real-time with comprehensive audit logs and execution dashboards
- **Chat with agents** using streaming LLM integration (OpenAI, Anthropic, etc.)
- **Schedule automated tasks** with cron expressions or interval-based execution
- **Integrate external services** via OAuth with scoped permissions
- **Store artifacts securely** in S3 with per-agent isolation
- **Receive notifications** on critical events, errors, and approval requests

## Architecture

**Tech Stack:**
- **Frontend:** React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend:** Express 4 + tRPC 11 + Drizzle ORM
- **Database:** MySQL/TiDB
- **Storage:** AWS S3
- **Authentication:** Custom email-based auth + Manus OAuth (optional)
- **LLM Integration:** Built-in Forge API (supports OpenAI, Anthropic, etc.)

**Key Components:**
- `client/` — React frontend with dashboard, agent management, chat, and monitoring
- `server/` — tRPC routers for agents, skills, tasks, audit logs, integrations, and files
- `drizzle/` — Database schema and migrations
- `server/_core/` — Core infrastructure (OAuth, LLM, storage, notifications)

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL/TiDB database
- Manus platform account (for hosting and OAuth)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TheDataContainers/shashclaw.git
   cd shashclaw
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file with the following (provided by Manus platform):
   ```
   DATABASE_URL=mysql://user:password@host:port/database
   JWT_SECRET=your-jwt-secret
   VITE_APP_ID=your-manus-app-id
   OAUTH_SERVER_URL=https://api.manus.im
   VITE_OAUTH_PORTAL_URL=https://manus.im
   OWNER_OPEN_ID=your-owner-id
   OWNER_NAME=Your Name
   BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
   BUILT_IN_FORGE_API_KEY=your-forge-api-key
   VITE_FRONTEND_FORGE_API_KEY=your-frontend-forge-key
   VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge
   VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
   VITE_ANALYTICS_WEBSITE_ID=your-website-id
   ```

4. **Push database schema:**
   ```bash
   pnpm db:push
   ```

5. **Start the development server:**
   ```bash
   pnpm dev
   ```
   The app will be available at `http://localhost:3000`

6. **Run tests:**
   ```bash
   pnpm test
   ```

## Authentication

Shashclaw includes a **custom authentication system** that works independently of Manus OAuth, making it suitable for deployment outside the Manus platform.

### Custom Email-Based Authentication

The default authentication method uses email-based login with token verification:

**Login Flow:**
1. User enters email at `/login`
2. System generates a temporary authentication token
3. User receives token (in demo mode, shown in UI; in production, sent via email)
4. User verifies token to create a session
5. User is logged in and can access the dashboard

**API Endpoints:**
- `POST /api/auth/login` — Request login token
  ```json
  { "email": "user@example.com" }
  ```
- `POST /api/auth/verify-token` — Verify token and create session
  ```json
  { "tempToken": "...", "email": "user@example.com", "name": "User Name" }
  ```
- `GET /api/auth/demo-login` — Quick demo account login (for testing)

### Extending Authentication

The authentication system is designed to be extensible. See [EXTENSIBILITY.md](./EXTENSIBILITY.md#custom-authentication) for details on:
- Adding email verification (magic links)
- Implementing password-based authentication
- Integrating with LDAP/Active Directory
- Adding OAuth2 providers (GitHub, Google, etc.)
- Supporting SAML

### Manus OAuth (Optional)

If deployed on the Manus platform, the standard Manus OAuth flow is still available at `/api/oauth/callback`. The custom auth and Manus OAuth can coexist.

## Project Structure

```
shashclaw/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/            # Feature pages (Dashboard, Agents, Chat, etc.)
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts (Theme, Auth)
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/trpc.ts       # tRPC client configuration
│   │   ├── App.tsx           # Routes and layout
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Global styles and theme
│   ├── public/               # Static assets (favicon, robots.txt)
│   └── index.html            # HTML template
├── server/                    # Express backend
│   ├── routers.ts            # tRPC procedure definitions
│   ├── db.ts                 # Database query helpers
│   ├── storage.ts            # S3 file storage helpers
│   ├── routers.test.ts       # Vitest tests
│   ├── auth.logout.test.ts   # Auth test example
│   └── _core/                # Core infrastructure
│       ├── index.ts          # Express server setup
│       ├── context.ts        # tRPC context
│       ├── trpc.ts           # tRPC router definitions
│       ├── oauth.ts          # OAuth flow
│       ├── llm.ts            # LLM integration
│       ├── notification.ts   # Owner notifications
│       ├── env.ts            # Environment variables
│       └── ...
├── drizzle/                   # Database
│   ├── schema.ts             # Table definitions
│   └── migrations/           # Auto-generated migrations
├── shared/                    # Shared types and constants
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── README.md                 # This file
```

## Core Features

### 1. Agent Management

Create, configure, and manage AI agents with isolated workspaces:

- **Agent CRUD** — Create, read, update, delete agents
- **Container Isolation** — Each agent runs in an isolated environment
- **Memory Persistence** — Agents can store and retrieve conversation history
- **Status Monitoring** — Track agent state (idle, running, error)
- **System Prompts** — Customize agent behavior with system instructions

**API Endpoints:**
- `POST /api/trpc/agent.create` — Create a new agent
- `GET /api/trpc/agent.list` — List all agents
- `GET /api/trpc/agent.getById` — Get agent details
- `PATCH /api/trpc/agent.update` — Update agent configuration
- `DELETE /api/trpc/agent.delete` — Delete an agent
- `POST /api/trpc/agent.start` — Start an agent
- `POST /api/trpc/agent.stop` — Stop an agent

### 2. Chat Interface

Interact with agents using natural language with streaming LLM responses:

- **Message History** — Persistent conversation history per agent
- **Streaming Responses** — Real-time token-by-token output
- **LLM Integration** — Support for multiple LLM providers
- **Context Management** — Automatic context window management

**API Endpoints:**
- `GET /api/trpc/chat.history` — Retrieve message history
- `POST /api/trpc/chat.send` — Send a message and get AI response

### 3. Skills Management

Install and manage agent capabilities with permission controls:

- **Skill Registry** — Browse available skills
- **Installation** — Install skills to agents
- **Permissions** — Grant/revoke skill permissions
- **Marketplace** — Discover and vet new skills
- **Built-in Skills** — Pre-built capabilities (Web Scraper, File Analyzer, etc.)

**API Endpoints:**
- `GET /api/trpc/skill.list` — List all skills
- `GET /api/trpc/skill.getById` — Get skill details
- `POST /api/trpc/skill.create` — Create a new skill (admin only)
- `PATCH /api/trpc/skill.update` — Update skill (admin only)
- `POST /api/trpc/skill.install` — Install skill to agent
- `POST /api/trpc/skill.uninstall` — Uninstall skill from agent

### 4. Scheduled Tasks

Automate agent execution with cron or interval-based scheduling:

- **Cron Expressions** — Standard cron syntax for precise scheduling
- **Interval Tasks** — Repeat at fixed intervals
- **One-time Tasks** — Execute once at a specific time
- **Task History** — Track execution history and results
- **Error Handling** — Automatic retry and error notifications

**API Endpoints:**
- `GET /api/trpc/task.list` — List scheduled tasks
- `POST /api/trpc/task.create` — Create a scheduled task
- `PATCH /api/trpc/task.update` — Update task configuration
- `DELETE /api/trpc/task.delete` — Delete a task

### 5. Audit Logs

Comprehensive logging of all agent actions and platform events:

- **Action Tracking** — Log all agent operations
- **Severity Levels** — Critical, warning, info, debug
- **Categories** — Agent, skill, task, integration, system
- **Filtering** — Search and filter logs by category, severity, date
- **Export** — Download logs for compliance and analysis

**API Endpoints:**
- `GET /api/trpc/audit.list` — Retrieve audit logs with filtering

### 6. Integrations

Connect agents to external services via OAuth:

- **OAuth Flow** — Secure authorization with scoped permissions
- **Provider Support** — GitHub, Google, Slack, etc.
- **Token Management** — Automatic token refresh and revocation
- **Scope Control** — Fine-grained permission management

**API Endpoints:**
- `GET /api/trpc/integration.list` — List integrations
- `POST /api/trpc/integration.create` — Create a new integration
- `PATCH /api/trpc/integration.update` — Update integration
- `DELETE /api/trpc/integration.delete` — Revoke integration

### 7. File Storage

Store agent-generated artifacts securely in S3:

- **Per-Agent Isolation** — Each agent has isolated storage
- **File Categories** — Artifacts, logs, outputs, models
- **Metadata** — Track file ownership, creation time, size
- **Secure URLs** — Presigned URLs for temporary access

**API Endpoints:**
- `GET /api/trpc/file.list` — List agent files
- `POST /api/trpc/file.upload` — Upload a file
- `DELETE /api/trpc/file.delete` — Delete a file

### 8. Configuration

Platform-wide settings for LLM providers, security, and notifications:

- **LLM Provider** — Configure default LLM provider and API keys
- **Security Settings** — Container isolation, concurrent agent limits
- **Notifications** — Configure alert preferences

**Settings Pages:**
- **LLM Providers** — Set default provider, API keys, token limits
- **Security** — Auto-isolation, concurrent agent limits
- **Notifications** — Error alerts, task completion, approval requests

### 9. Dashboard

Real-time overview of platform metrics and recent activity:

- **Key Metrics** — Total agents, running agents, available skills, scheduled tasks
- **Recent Agents** — Quick access to recently created agents
- **Recent Activity** — Latest audit log entries
- **Status Indicators** — Visual indicators for agent health

## Database Schema

### Core Tables

**agents**
- `id` — Primary key
- `userId` — Owner of the agent
- `name` — Agent name
- `description` — Agent description
- `status` — Current status (idle, running, error, stopped)
- `llmProvider` — LLM provider (default, openai, anthropic)
- `systemPrompt` — System instructions for the agent
- `config` — JSON configuration (max_tokens, temperature, etc.)
- `mountedDirs` — JSON array of mounted directories
- `permissions` — JSON object of granted permissions
- `memoryEnabled` — Whether to persist conversation history
- `createdAt`, `updatedAt` — Timestamps

**skills**
- `id` — Primary key
- `name` — Skill name
- `slug` — URL-friendly identifier
- `description` — Skill description
- `version` — Semantic version
- `author` — Skill author
- `category` — Skill category (web, file, data, etc.)
- `isBuiltIn` — Whether it's a built-in skill
- `isVerified` — Whether it's been security-vetted
- `permissions` — JSON object of required permissions
- `config` — JSON configuration schema
- `installCount` — Number of installations
- `createdAt`, `updatedAt` — Timestamps

**agent_skills**
- `id` — Primary key
- `agentId` — Agent reference
- `skillId` — Skill reference
- `config` — JSON skill configuration for this agent
- `createdAt` — Installation timestamp

**messages**
- `id` — Primary key
- `agentId` — Agent reference
- `role` — Message role (user, assistant, system)
- `content` — Message content
- `tokens` — Token count
- `createdAt` — Timestamp

**audit_logs**
- `id` — Primary key
- `agentId` — Agent reference (nullable)
- `userId` — User reference
- `action` — Action name (agent.created, skill.installed, etc.)
- `category` — Log category (agent, skill, task, integration, system)
- `severity` — Severity level (critical, warning, info, debug)
- `details` — JSON details object
- `ipAddress` — IP address of the requester
- `createdAt` — Timestamp

**scheduled_tasks**
- `id` — Primary key
- `agentId` — Agent reference
- `userId` — Owner reference
- `name` — Task name
- `description` — Task description
- `cronExpression` — Cron expression (for cron tasks)
- `intervalSeconds` — Interval in seconds (for interval tasks)
- `taskType` — Task type (cron, interval, once)
- `prompt` — Prompt to send to the agent
- `enabled` — Whether the task is active
- `lastRunAt` — Timestamp of last execution
- `nextRunAt` — Timestamp of next execution
- `lastStatus` — Status of last run (pending, success, error)
- `createdAt`, `updatedAt` — Timestamps

**agent_files**
- `id` — Primary key
- `agentId` — Agent reference
- `fileName` — Original file name
- `fileKey` — S3 object key
- `url` — Presigned S3 URL
- `mimeType` — MIME type
- `size` — File size in bytes
- `category` — File category (artifact, log, output, model)
- `createdAt` — Timestamp

**integrations**
- `id` — Primary key
- `userId` — Owner reference
- `provider` — Provider name (github, google, slack, etc.)
- `label` — User-friendly label
- `status` — Status (active, revoked, expired)
- `accessToken` — Encrypted access token
- `refreshToken` — Encrypted refresh token (nullable)
- `expiresAt` — Token expiration timestamp
- `scopes` — JSON array of granted scopes
- `createdAt`, `updatedAt` — Timestamps

## API Documentation

### Authentication

All protected endpoints require authentication via Manus OAuth. The session cookie is automatically set after OAuth callback.

**Public Procedures:**
- `auth.me` — Get current user (returns null if unauthenticated)
- `auth.logout` — Clear session cookie

**Protected Procedures:**
- All other endpoints require `ctx.user` to be set

### Error Handling

The API uses tRPC error codes:
- `UNAUTHORIZED` — User not authenticated
- `FORBIDDEN` — User lacks permission
- `NOT_FOUND` — Resource not found
- `BAD_REQUEST` — Invalid input
- `INTERNAL_SERVER_ERROR` — Server error

### Response Format

All responses use tRPC's superjson format, which preserves Date objects and other complex types.

```typescript
// Successful response
{ result: { data: { ... } } }

// Error response
{ error: { code: "NOT_FOUND", message: "Agent not found" } }
```

## Security Considerations

### Container Isolation

Each agent runs in an isolated environment with:
- Explicit directory mounting (no access to system directories)
- Sandboxed skill execution
- Resource limits (CPU, memory, disk)
- Network isolation (configurable)

### Permission Model

- **User-level:** Users can only access their own agents and integrations
- **Admin-level:** Admins can create skills, manage platform settings
- **Skill-level:** Skills have explicit permission requirements
- **Integration-level:** OAuth scopes limit what integrations can access

### Audit Trail

All actions are logged with:
- User who performed the action
- IP address
- Timestamp
- Action details
- Severity level

### Secrets Management

- API keys and tokens are stored encrypted in the database
- Environment variables are injected at runtime
- No secrets are committed to version control
- `.env` files are in `.gitignore`

## Development Workflow

### Adding a New Feature

1. **Update database schema** in `drizzle/schema.ts`
2. **Push migrations** with `pnpm db:push`
3. **Add query helpers** in `server/db.ts`
4. **Create tRPC procedures** in `server/routers.ts`
5. **Build UI pages** in `client/src/pages/`
6. **Write tests** in `server/*.test.ts`
7. **Run tests** with `pnpm test`

### Code Style

- Use TypeScript for type safety
- Follow React hooks best practices
- Use shadcn/ui components for consistency
- Write vitest tests for all routers
- Format code with Prettier: `pnpm format`

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test server/routers.test.ts
```

## Deployment

Shashclaw is built to run on the Manus platform with built-in hosting:

1. **Create a checkpoint** — Save your changes
2. **Click Publish** — In the Manus Management UI
3. **Configure domain** — Use auto-generated `shashclaw.manus.space` or bind a custom domain
4. **Access your site** — Live at your configured domain

For external hosting (Railway, Render, Vercel), note that compatibility may vary.

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL/TiDB connection string |
| `JWT_SECRET` | Yes | Session cookie signing secret |
| `VITE_APP_ID` | Yes | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Yes | Manus OAuth server URL |
| `VITE_OAUTH_PORTAL_URL` | Yes | Manus login portal URL |
| `OWNER_OPEN_ID` | Yes | Platform owner's OpenID |
| `OWNER_NAME` | Yes | Platform owner's name |
| `BUILT_IN_FORGE_API_URL` | Yes | Manus Forge API URL |
| `BUILT_IN_FORGE_API_KEY` | Yes | Server-side Forge API key |
| `VITE_FRONTEND_FORGE_API_KEY` | Yes | Frontend Forge API key |
| `VITE_FRONTEND_FORGE_API_URL` | Yes | Frontend Forge API URL |
| `VITE_ANALYTICS_ENDPOINT` | No | Analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | No | Analytics website ID |

## Troubleshooting

### Database Connection Error

```
Error: connect ECONNREFUSED
```

Check that `DATABASE_URL` is correct and the database is running.

### OAuth Callback Error

```
Error: Invalid state parameter
```

Ensure `OAUTH_SERVER_URL` and `VITE_OAUTH_PORTAL_URL` match your Manus configuration.

### LLM Integration Error

```
Error: Failed to invoke LLM
```

Verify `BUILT_IN_FORGE_API_KEY` and `BUILT_IN_FORGE_API_URL` are correct.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see LICENSE file for details

## Support

For issues, questions, or feature requests, please open an issue on GitHub or contact the DataContainers team.

## Roadmap

- [ ] WebSocket real-time updates for agent status
- [ ] Advanced skill marketplace with ratings and reviews
- [ ] Agent collaboration and team workspaces
- [ ] Custom LLM model fine-tuning
- [ ] Advanced analytics and performance metrics
- [ ] Agent versioning and rollback
- [ ] Multi-language support
- [ ] Mobile app for agent monitoring

---

**Built with ❤️ by the DataContainers team**
