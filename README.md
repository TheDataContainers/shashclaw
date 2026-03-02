# Shashclaw

A production-ready platform for deploying, managing, and monitoring AI agents with enterprise-grade security, inspired by OpenClaw's functionality and NanoClaw's security principles.

---

## 🔒 Security-First Platform

Shashclaw is designed with **defense-in-depth security** that addresses all critical risks identified in Microsoft's OpenClaw security guidance. 

### ✅ All 6 Critical Risks Addressed

| Risk | Shashclaw Control |
|------|-------------------|
| **Credentials exposed/exfiltrated** | AES-256-GCM encryption + per-user access control |
| **Agent memory/state modified** | Comprehensive audit logging with immutable trails |
| **Host compromise via malicious code** | Container isolation + explicit directory mounting |
| **Indirect prompt injection** | Input validation + rate limiting + per-agent isolation |
| **Malicious skills in registry** | Marketplace disabled + manual approval + sandboxing |
| **Privilege reuse via APIs** | Credential isolation + rate limiting + HMAC signatures |

### Key Security Features

- 🔐 **AES-256-GCM Encryption** — All credentials encrypted at rest, decrypted only in memory
- 🏗️ **Container Sandboxing** — Agents run in isolated Docker containers with explicit directory mounting
- 📋 **Immutable Audit Logs** — All state changes logged with timestamps and full context
- ⏱️ **Rate Limiting** — Token bucket algorithm on all API endpoints
- 🛑 **Kill Switch** — Emergency platform pause capability
- 🔑 **Webhook Security** — HMAC-SHA256 signatures prevent tampering
- 👤 **Single-User Mode** — Isolated deployments restricted to owner only

**→ [Read Full Security Audit](./docs/SECURITY_AUDIT_MICROSOFT_OPENCLAW.md)**

---

## 📚 Documentation

All documentation is organized in the `docs/` folder:

| Document | Purpose |
|----------|---------|
| **[SECURITY.md](./docs/SECURITY.md)** | Security architecture, encryption, authentication, audit logging |
| **[SECURITY_AUDIT_MICROSOFT_OPENCLAW.md](./docs/SECURITY_AUDIT_MICROSOFT_OPENCLAW.md)** | Detailed audit against Microsoft's OpenClaw security guidance |
| **[README.md](./docs/README.md)** | Getting started, architecture, API documentation |
| **[EXTENSIBILITY.md](./docs/EXTENSIBILITY.md)** | Deployment outside Manus, custom providers, plugin architecture |
| **[CONTRIBUTING.md](./docs/CONTRIBUTING.md)** | Development workflow, testing, CI/CD, git practices |
| **[CHANGELOG.md](./docs/CHANGELOG.md)** | Version history and release notes |

---

## Overview

Shashclaw enables you to:

- **Deploy AI agents** in isolated container environments with explicit directory mounting and sandboxed execution
- **Manage agent skills** with a marketplace registry and permission-based access controls
- **Monitor agent activity** in real-time with comprehensive audit logs and execution dashboards
- **Chat with agents** using streaming LLM integration (OpenAI, Anthropic, Google Gemini)
- **Schedule automated tasks** with cron expressions or interval-based execution
- **Integrate external services** via OAuth with scoped permissions
- **Store artifacts securely** in S3 with per-agent isolation
- **Receive notifications** on critical events, errors, and approval requests

---

## Quick Start

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

---

## Architecture

**Tech Stack:**
- **Frontend:** React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend:** Express 4 + tRPC 11 + Drizzle ORM
- **Database:** MySQL/TiDB
- **Storage:** AWS S3
- **Authentication:** Custom email-based auth + Manus OAuth (optional)
- **LLM Integration:** Built-in Forge API (supports OpenAI, Anthropic, Google Gemini)

**Key Components:**
- `client/` — React frontend with dashboard, agent management, chat, and monitoring
- `server/` — tRPC routers for agents, skills, tasks, audit logs, integrations, and files
- `drizzle/` — Database schema and migrations
- `server/_core/` — Core infrastructure (OAuth, LLM, storage, notifications)

---

## Features

### 13 Core Features Implemented

1. ✅ **Container-isolated agent execution** — Docker-based sandboxing with explicit directory mounting
2. ✅ **Skill management system** — Permission-based skill execution with sandboxing
3. ✅ **Real-time monitoring** — Live dashboard with agent status and execution progress
4. ✅ **Multi-agent support** — Per-agent isolated workspaces and memory persistence
5. ✅ **Chat interface** — Streaming LLM responses with message history
6. ✅ **Scheduled tasks** — Cron-based or interval-based task automation
7. ✅ **OAuth integrations** — External service integration with scoped permissions
8. ✅ **Configuration panel** — LLM provider setup and API key management
9. ✅ **Skill marketplace** — Registry for pre-built capabilities (disabled pending audit)
10. ✅ **WebSocket updates** — Real-time agent status and execution progress
11. ✅ **LLM provider support** — OpenAI, Anthropic Claude, Google Gemini
12. ✅ **S3 storage** — Secure file storage with per-agent isolation
13. ✅ **Owner notifications** — Critical events, errors, and approval requests

---

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
- `POST /api/auth/verify-token` — Verify token and create session
- `GET /api/auth/demo-login` — Quick demo account login (for testing)

### Manus OAuth (Optional)

If deployed on the Manus platform, the standard Manus OAuth flow is still available at `/api/oauth/callback`. The custom auth and Manus OAuth can coexist.

---

## Deployment

### Manus Platform

Shashclaw is live at **[https://shashclaw.manus.space](https://shashclaw.manus.space)**

### External Hosting

Shashclaw can be deployed on:
- **Docker** — Containerized deployment with `docker-compose`
- **Kubernetes** — Scalable multi-node deployments
- **Self-hosted** — Any environment with Node.js and MySQL/TiDB

See [EXTENSIBILITY.md](./docs/EXTENSIBILITY.md) for detailed deployment guides.

---

## Testing

All features are covered by comprehensive tests:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test -- --coverage
```

**Test Coverage:** 33 tests passing across:
- Authentication and authorization
- Agent CRUD operations
- Skill management
- Integration management
- Webhook delivery and retry logic
- Rate limiting
- Audit logging

---

## CI/CD

Shashclaw uses GitHub Actions for automated quality checks:

| Workflow | Purpose | Status |
|----------|---------|--------|
| **Lint** | ESLint, Prettier, TypeScript | Required ✅ |
| **Test** | vitest + Codecov | Required ✅ |
| **Security** | Trivy, dependency audit, TruffleHog, CodeQL | Required ✅ |
| **Build** | Vite + esbuild verification | Required ✅ |
| **Deploy** | Production deployment tracking | Informational ℹ️ |

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for details.

---

## Support & Resources

- **Documentation** — See `docs/` folder
- **Issues** — [GitHub Issues](https://github.com/TheDataContainers/shashclaw/issues)
- **Security** — See [SECURITY.md](./docs/SECURITY.md)
- **Contributing** — See [CONTRIBUTING.md](./docs/CONTRIBUTING.md)

---

## License

MIT License — See LICENSE file for details

---

## Acknowledgments

- **Inspired by:** OpenClaw (functionality) and NanoClaw (security principles)
- **Built with:** React, Express, tRPC, Drizzle ORM, Tailwind CSS
- **Hosted on:** Manus platform

---

**Live at:** [https://shashclaw.manus.space](https://shashclaw.manus.space)  
**Repository:** [https://github.com/TheDataContainers/shashclaw](https://github.com/TheDataContainers/shashclaw)  
**Latest Version:** v0.7.0
