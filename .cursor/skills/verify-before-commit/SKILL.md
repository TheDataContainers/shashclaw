---
name: verify-before-commit
description: Runs pnpm build, pnpm dev, and GET /api/auth/demo-login and GET /api/health before any commit. Use when the user or agent is about to commit, or when asked to commit. If build, dev, or any endpoint fails, fix before committing.
---

# Verify Before Commit

Before any commit, run this workflow. If any step fails, fix the issue and do **not** commit until all pass.

## Workflow

1. **Build**
   ```bash
   pnpm build
   ```
   Must exit 0. If it fails, fix build errors and re-run.

2. **Start dev server**
   ```bash
   pnpm dev
   ```
   Run in the background. Wait until the server is listening (e.g. "Server running on http://..." in output). Default port is 3000 (`process.env.PORT` or 3000).

3. **Test endpoints**
   Use the same port the dev server printed (default 3000). Base URL: `http://localhost:3000` unless the app uses a different port.

   - **GET /api/health**
     ```bash
     curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health
     ```
     Expect: 200.

   - **GET /api/auth/demo-login**
     ```bash
     curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/demo-login
     ```
     Expect: 200 or 302 (redirect). Non-5xx and non-4xx that indicates a broken route = pass.

   If either returns 5xx or connection refused, the check fails.

4.**Browser verification**
   Open http://localhost:3000 in browser.
   Test manually:
   - Login via /api/auth/demo-login
   - Dashboard loads
   - Create an agent
   - Send a chat message
   - Check browser console for errors
   
   **Wait for developer to confirm "looks good" before proceeding.**
   Never commit until developer confirms.


5.**If any step failed**
   - Fix the cause (build error, runtime error, or failing endpoint).
   - Re-run from step 1. Do **not** commit until build, dev server, and both endpoint checks succeed.

6. **Only after all steps pass**
   Proceed with the commit.

## Summary

- Order: `pnpm build` → `pnpm dev` (background) → GET `/api/health` → GET `/api/auth/demo-login`.
- Fail = fix first, then re-verify; never commit while something is failing.
