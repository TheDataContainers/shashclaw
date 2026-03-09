# Shashclaw

A self-hosted AI agent platform. Create agents, give them a system prompt, and chat with them using your own Anthropic API key — or try it with 5 free demo prompts.

**[Live Demo →](https://shashclaw.up.railway.app)** &nbsp;|&nbsp; Deploy your own in minutes

---

## What it does

- **AI Agents** — Create agents with custom system prompts and personalities
- **Streaming chat** — Token-by-token responses, no frozen UI
- **Bring Your Own Key** — Connect your Anthropic API key; your usage, your cost
- **Demo tier** — 5 free prompts on Claude Haiku, no signup required
- **Audit logs** — Every action logged with timestamps
- **Scheduled tasks** — CRUD interface for recurring agent tasks
- **Service integrations** — Slack, Discord, and webhook connections
- **Single-user mode** — Lock your instance to your email only

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express, tRPC, TypeScript |
| Database | Drizzle ORM → Neon PostgreSQL |
| Auth | Custom email token + JWT sessions |
| LLM | Anthropic API (direct, no proxy) |
| Deploy | Railway |

## Deploy your own

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template)

```bash
git clone https://github.com/TheDataContainers/shashclaw
cd shashclaw
pnpm install
pnpm db:push
pnpm dev
```

### Required environment variables

```env
DATABASE_URL=          # Neon PostgreSQL connection string
JWT_SECRET=            # Any long random string
ANTHROPIC_KEY=         # Your Anthropic API key (sk-ant-...)
NODE_ENV=production
```

### Optional

```env
SINGLE_USER_MODE=true  # Restrict to owner email only
OWNER_EMAIL=           # Your email (used with SINGLE_USER_MODE)
RESEND_API_KEY=        # Real magic link emails via Resend.com
RESEND_FROM_EMAIL=     # Sender address
```

## User tiers

| Tier | Access | Cost |
|------|--------|------|
| Demo | 5 prompts on Claude Haiku | Free (you pay) |
| BYOK | Unlimited with own Anthropic key | Their cost |
| Owner | Full access via `ANTHROPIC_KEY` env var | Your cost |

## Local development

```bash
pnpm dev        # Start frontend + backend with hot reload
pnpm build      # Production build
pnpm db:push    # Push schema changes to Neon
pnpm test       # Run tests
pnpm check      # TypeScript check
```

## Architecture

```
client/          React 19 frontend (Vite)
server/
  _core/         Express setup, JWT auth, LLM client, SSE streaming
  routers.ts     All tRPC procedures
  db.ts          All database queries
  chatStream.ts  Streaming chat endpoint (POST /api/chat/stream)
  customAuth.ts  Email token auth + demo login + magic links
drizzle/
  schema.ts      13 database tables
```

## License

MIT
