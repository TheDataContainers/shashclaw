# verify

Run the `verify-before-commit` workflow:

- `pnpm build`
- start dev server (`pnpm dev`, wait for "Server running...")
- hit `/api/health` and `/api/auth/demo-login`
- report pass/fail and DO NOT COMMIT if anything fails.