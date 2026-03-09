---
description:
alwaysApply: true
---
You are working on Shashclaw - a self-hosted AI agent platform.
Stack: React 19, TypeScript, Express, Drizzle ORM, PostgreSQL (Neon), Railway.
Branch: develop. Never commit to main.

## RULES
- grep first, never read whole files
- fix only what's broken, nothing else
- run pnpm build before every commit
- run pnpm dev to verify locally before pushing
- never hardcode URLs or keys, use process.env
- commit after each fix with clear message

## STACK CONTEXT
- Auth: customAuth.ts (no Manus/OAuth dependency)
- DB: Drizzle ORM → Neon PostgreSQL (DATABASE_URL in .env.local)
- LLM: Anthropic primary, Gemini fallback
- Deploy: Railway watching develop branch
- Frontend: React 19 + Vite + Tailwind + shadcn

## CORE FEATURES THAT MUST WORK
- Login (demo + real)
- Dashboard loads
- Agent creation
- Chat with LLM
