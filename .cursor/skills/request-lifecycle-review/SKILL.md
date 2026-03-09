---
name: request-lifecycle-review
description: Reviews the full request lifecycle (client → tRPC/REST → customAuth/sdk → Drizzle/Neon → Anthropic LLM → response) and identifies or fixes broken links. Use when debugging request failures, auth issues, DB errors, or LLM errors, or when the user asks to review the request chain.
---

# Request Lifecycle Review

Trace the chain below. At each step, verify the link works; if it fails, fix before proceeding.

## 1. Client → API (tRPC / REST)

- **tRPC**: All app procedures are under `appRouter` in `server/routers.ts`. Entry: `server/_core/index.ts` → `createExpressMiddleware` at `/api/trpc` with `createContext`.
- **REST**: Auth routes in `server/customAuth.ts` (`registerCustomAuthRoutes`). Mounted in `server/_core/index.ts` before tRPC (order: OAuth, customAuth, then tRPC).

**Broken link**: 404 or wrong path → confirm route is registered and path matches client (e.g. tRPC batch path `/api/trpc/...`).

## 2. Server authentication (customAuth / SDK)

- **Context**: `server/_core/context.ts` → `createContext()` calls `sdk.authenticateRequest(opts.req)`.
- **SDK**: `server/_core/sdk.ts` → `authenticateRequest(req)` reads cookie `COOKIE_NAME`, calls `verifySession(sessionCookie)` (JWT with `ENV.cookieSecret`), then `db.getUserByOpenId(session.openId)`.
- **Custom auth**: `server/customAuth.ts` sets the same cookie via `sdk.createSessionToken(openId, ...)` after demo-login or verify-token; `db.upsertUser` ensures user exists.

**Broken link**: UNAUTHORIZED or "Invalid session" → missing or invalid cookie, wrong `JWT_SECRET`, or user missing in DB. Fix: ensure `JWT_SECRET` is set; for protected routes, client must have valid session (e.g. hit GET `/api/auth/demo-login` first or use login flow). If `ctx.user` is null on a protected procedure, auth failed.

## 3. DB query (Drizzle → Neon PostgreSQL)

- **DB**: `server/db.ts` → `getDb()` returns a Drizzle instance from `ENV.databaseUrl` (Neon). All user/agent/skill/message etc. access goes through `server/db.ts` or `server/integrations.ts` (which use the same DB).
- **ENV**: `server/_core/env.ts` → `databaseUrl: process.env.DATABASE_URL ?? ""`.

**Broken link**: `getDb()` returns null (no DB), or queries throw (e.g. connection/SSL). Fix: set `DATABASE_URL` to a valid Neon Postgres URL. If `getDb()` is null, many db helpers no-op or warn (e.g. `upsertUser`); fix by ensuring `DATABASE_URL` is set and Drizzle can connect.

## 4. LLM call (Anthropic direct)

- **Invoke**: `server/_core/llm.ts` → `invokeLLM(params)`.
- **Config**: `resolveApiUrl()` returns `https://api.anthropic.com/v1/messages`; `assertApiKey()` requires `ENV.anthropicKey` (`ANTHROPIC_KEY`). Request is POST with `x-api-key` header, model `claude-sonnet-4-5-20250929`.

**Broken link**: "Anthropic API key is not configured" or non-2xx from Anthropic. Fix: set `ANTHROPIC_KEY` env var. If Anthropic returns 4xx, check key validity and model name.

## 5. Response back to client

- **tRPC**: Procedure return value is serialized (superjson) and sent by the tRPC adapter.
- **REST**: `res.json(...)` or `res.redirect(...)` in `customAuth.ts` and OAuth routes.

**Broken link**: Client gets error shape or missing data → check procedure return type and that no middleware throws after the handler runs; for REST, check status codes and JSON shape.

---

## Checklist (trace and fix)

1. **API entry**: Route registered? Client calling correct path?
2. **Auth**: Cookie present and valid? `JWT_SECRET` set? User exists in DB for that `openId`?
3. **DB**: `DATABASE_URL` set and Neon reachable? `getDb()` non-null?
4. **LLM**: `ANTHROPIC_KEY` set? Anthropic endpoint returns 2xx?
5. **Response**: Handler returns expected shape; no uncaught throw.

Use grep to find usages (e.g. `getDb`, `authenticateRequest`, `invokeLLM`, `ENV.`) and fix the failing step.
