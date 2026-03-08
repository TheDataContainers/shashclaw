# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules - Read First
- grep/find before reading any file
- make small focused changes only
- never rewrite working logic
- confirm after each step
- use minimum tokens possible

## Stack - Do Not Change
React, Tailwind, shadcn, Drizzle, MySQL, Express, tRPC

---

## Common Commands

```bash
# Development
pnpm dev              # Start dev server (watches server/_core/index.ts)

# Building
pnpm build            # Full build: Vite (frontend) + esbuild (server)

# Testing
pnpm test             # Run all tests once
pnpm test --watch     # Run tests in watch mode
pnpm test -- --coverage  # Run with coverage report

# Code Quality
pnpm check            # Type check with tsc
pnpm format           # Format code with prettier

# Database
pnpm db:push          # Generate migrations and push to database

# Production
pnpm start            # Run production build (NODE_ENV=production)
```

---

## Architecture Overview

**Full-Stack Application:** React frontend → tRPC API → Express backend → MySQL database

### Directory Structure

```
client/src/          React frontend (Vite)
├── pages/           Page components (routing with wouter)
├── components/      UI components (shadcn/ui + Radix)
├── contexts/        React contexts (global state)
├── hooks/           Custom React hooks
├── lib/             Utilities and helpers
└── main.tsx         Entry point

server/              Express + tRPC backend
├── routers.ts       tRPC router definitions (agents, skills, tasks, etc.)
├── db.ts            Database queries and utilities
├── integrations.ts  OAuth and external service integration
├── webhooks.ts      Webhook management and delivery
├── storage.ts       S3 file storage
├── customAuth.ts    Email-based authentication
└── _core/           Core infrastructure services
    ├── index.ts     Express server entry point
    ├── oauth/       OAuth provider implementations
    ├── llm/         LLM provider integrations
    ├── storage/     Storage backends (S3, local)
    └── webhooks/    Webhook dispatch and retry logic

drizzle/            Database schema and migrations
├── schema.ts        All table definitions
├── migrations/      SQL migration files
└── relations.ts     Table relationships

shared/             Shared types and utilities
├── types.ts         Common TypeScript types
└── utils/           Shared utility functions
```

### Key Architecture Patterns

**Database Schema:** Drizzle ORM with MySQL. All tables defined in `drizzle/schema.ts`. Generate migrations with `drizzle-kit generate`.

**tRPC Routers:** All API endpoints defined in `server/routers.ts`. Organized as:
- `auth.*` — Authentication and sessions
- `agents.*` — Agent CRUD and management
- `skills.*` — Skill registry and execution
- `tasks.*` — Task scheduling and execution
- `integrations.*` — OAuth integrations
- `webhooks.*` — Webhook management
- `audit.*` — Audit logs and compliance

**Frontend State:** React Context + React Query (@tanstack/react-query) for server state. No Redux/Zustand.

**Authentication:** Custom email-based auth (tokens) in `server/customAuth.ts`. Optional Manus OAuth support via `server/_core/oauth/`.

**Storage:** AWS S3 via `server/storage.ts`. Can be extended to other backends in `server/_core/storage/`.

**Security:** AES-256-GCM encryption for credentials. All changes logged to audit tables. Rate limiting on API endpoints.

---

## Database Management

The project uses **Drizzle ORM** with MySQL/TiDB.

```bash
# After schema changes, generate SQL migrations:
drizzle-kit generate

# Then apply to database:
drizzle-kit migrate

# Or combined:
pnpm db:push
```

All schema is in `drizzle/schema.ts`. Each migration gets a generated SQL file in `drizzle/migrations/`.

---

## Testing

Tests are in `server/**/*.test.ts`. Uses **vitest** with Node environment.

```bash
pnpm test                    # Run once
pnpm test --watch            # Watch mode
pnpm test server/auth.logout.test.ts  # Single test file
```

**Test Patterns:**
- Use `describe()` and `it()` blocks
- Test setup: create test data in database, call tRPC endpoints
- Cleanup: tests run in transaction that's rolled back
- Mock external services (OAuth, LLM, S3) as needed

---

## Build and Deployment

**Frontend:** Vite bundle to `dist/public/`
**Server:** esbuild bundles `server/_core/index.ts` to `dist/index.js` with external packages

```bash
pnpm build    # Creates dist/public/ (frontend) and dist/index.js (server)
pnpm start    # Run dist/index.js with NODE_ENV=production
```

**Environment Variables:** Load from `.env.local` (dev) or environment (production).
See README.md for required variables.

---

## Important Implementation Details

1. **tRPC Procedures:** All backend endpoints go through tRPC routers for type-safe client/server communication
2. **Error Handling:** Use `TRPCError` for API errors with proper HTTP status codes
3. **Permissions:** Check `user.openId` against `OWNER_ID` for access control (single-user mode)
4. **Migrations:** Always use Drizzle migrations, never raw SQL
5. **Tests:** Backend tests only. Frontend tested by linters and type checker
