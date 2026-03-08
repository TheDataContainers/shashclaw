# VS Code Configuration for Shashclaw

This folder contains workspace-specific configuration files for efficient development.

## Files

### `settings.json`
- **Purpose**: Editor and project settings
- **Includes**: 
  - Auto-format on save (Prettier)
  - ESLint integration
  - TypeScript configuration
  - Excluded folders (node_modules, dist, .git)
  - Tab size and indentation rules
  - Bracket pair colorization

### `extensions.json`
- **Purpose**: Recommend extensions for the team
- **Key Extensions**:
  - `dbaeumer.vscode-eslint` — Linting
  - `esbenp.prettier-vscode` — Code formatting
  - `github.copilot` & `github.copilot-chat` — AI assistance
  - `eamodio.gitlens` — Git integration
  - `ms-azuretools.vscode-docker` — Docker support

### `launch.json`
- **Purpose**: Debug configurations
- **Configurations**:
  - **Vite Dev Server** — Start dev server with debugging
  - **Chrome - Localhost** — Debug client in Chrome
  - **API - Debug Tests** — Run tests with debugger
  - **Full Stack** — Launch both server and browser together

### `tasks.json`
- **Purpose**: Quick-run tasks
- **Available Tasks**:
  - **Build App** — `pnpm build` (Ctrl+Shift+B)
  - **Dev Server** — `pnpm dev` (background)
  - **Lint & Type Check** — `pnpm check:types`
  - **Tests (Watch)** — `pnpm test`
  - **Verify Before Commit** — Run build + dev server

## Quick Start

1. **Install Recommended Extensions**
   ```
   Cmd+Shift+X → "Recommended"
   ```

2. **Start Development**
   - Press `F5` to debug, or
   - Run task: `Cmd+Shift+P` → "Dev Server"

3. **Format Code**
   - Automatically on save, or
   - `Cmd+Shift+P` → "Format Document"

4. **Type Check & Lint**
   - `Cmd+Shift+B` → Select "Lint & Type Check"

5. **Before Committing**
   - Run "Verify Before Commit" task
   - Ensure build, dev server, and both APIs pass

## Environment

- `.env.local` must contain:
  - `DATABASE_URL` — Neon PostgreSQL connection
  - `BUILT_IN_FORGE_API_URL` — Anthropic Forge endpoint
  - `BUILT_IN_FORGE_API_KEY` — Anthropic API key

⚠️ **Never commit `.env.local`**

## See Also

- [`.copilot-instructions.md`](../.copilot-instructions.md) — Copilot guidelines & stack context
- [`CLAUDE.md`](../CLAUDE.md) — Team development rules
- [`README.md`](../README.md) — Project overview
