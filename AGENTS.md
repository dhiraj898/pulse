<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deploy & CI/CD — read `DEPLOY.md`

Hosting: **Render** (free web service) + **Supabase** (managed data/auth). AI is
external HTTP (Sarvam/Anthropic). One deploy unit — no separate FE/BE servers.

Way forward for any change:
- Work on a **feature branch**, never push to `main` directly.
- Open a **PR** → GitHub Actions `check` (lint · type-check · test · build) must
  pass; Render auto-creates a **PR preview** deploy.
- **Merge to `main`** (CI green) → `deploy` job fires the Render Deploy Hook →
  production release. Prod `autoDeploy` is off; merge is the only path to prod.

Before committing, run the full gate locally: `npm run lint && npm run type-check
&& npm test && npm run build`. Keep it green.

Migrations in `supabase/migrations/` are **not** auto-applied — apply to the DB
deliberately (`supabase db push` or the SQL editor). The hourly sync
(`/api/cron/sync`) is driven by pg_cron and needs the public app URL +
`CRON_SECRET`; it won't fire reliably on the free (idle-spindown) plan.

Full runbook, env vars, and one-time dashboard setup: **`DEPLOY.md`**.
