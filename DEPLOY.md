# Deploy & CI/CD

## Architecture
- **App**: Next.js 16 (frontend + API routes) — single Node web service on Render.
- **Data/Auth**: Supabase (managed; separate).
- **AI**: Sarvam / Anthropic over HTTP (external).

One deploy unit. No separate frontend/backend servers (see rationale: thin API glue, shared auth cookie domain, external AI).

## Branch strategy
- `main` = production. Protected: no direct pushes, merge via PR.
- Feature branches → PR → CI must pass → merge to `main` → auto-deploy.

## CI/CD pipeline (`.github/workflows/ci.yml`)
1. **On PR and push to `main`** — run `check`: lint → type-check → test → build (with CI dummy env).
2. **On push to `main` only** — `deploy`: after `check` passes, POST the Render Deploy Hook.

Render `autoDeploy` is **off** so deploys are gated on green CI, not raw pushes.

```
PR ──> CI (lint/types/test/build) ──> review ──> merge to main
                                                     │
                              push to main ──> CI ──> Deploy hook ──> Render build+release
```

## One-time setup

### 1. GitHub
```bash
gh repo create <org>/pulse --private --source=. --push
# or add a remote manually:
# git remote add origin git@github.com:<org>/pulse.git && git push -u origin main
```
Add branch protection on `main`: require the `check` job + PR review.

### 2. Render
- New → **Blueprint**, point at this repo (`render.yaml` is detected).
- Set all `sync: false` env vars in the Render dashboard (values from your `.env`; see `.env.example`).
- Settings → **Deploy Hook**: copy the URL.

### 3. GitHub secret
- Repo → Settings → Secrets → Actions → add `RENDER_DEPLOY_HOOK` = the Render hook URL.

### 4. Env values to set in Render
All keys listed in `render.yaml` with `sync: false`. Critical:
- `NEXT_PUBLIC_APP_URL` = the Render URL (e.g. `https://pulse.onrender.com`).
- `GOOGLE_REDIRECT_URI` / `FIREFLIES_REDIRECT_URI` updated to the Render URL.
- Update **Supabase** Auth → URL Configuration with the Render URL + `<render-url>/auth/callback`.
- Update the **Google OAuth client** authorized redirect URI to the Supabase callback (unchanged) and add the Render origin where needed.

## Database migrations
Migrations in `supabase/migrations/` are **not** auto-applied by Render. Apply them with the Supabase CLI before/with a release:
```bash
supabase link --project-ref ytbvqfhzuylzuxtpwoyd
supabase db push
```
Optionally add a `migrate` job to CI gated on `main` using `SUPABASE_ACCESS_TOKEN` + DB password as GitHub secrets. (Left manual for now — DDL on prod should be deliberate.)

## Scheduled sync (pg_cron)
`supabase/migrations/0006_cron_sync.sql` schedules the hourly all-users sync via pg_net → `<APP_URL>/api/cron/sync`. Apply it **after** deploy (needs the public Render URL + `CRON_SECRET` substituted).
