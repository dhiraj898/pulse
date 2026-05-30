# Deploy & CI/CD

## Architecture
- **App**: Next.js 16 (frontend + API routes) — single Node web service on Render.
- **Data/Auth**: Supabase (managed; separate).
- **AI**: Sarvam / Anthropic over HTTP (external).

One deploy unit. No separate frontend/backend servers (see rationale: thin API glue, shared auth cookie domain, external AI).

## Branch strategy
- `main` = production. Protected: no direct pushes, merge via PR.
- Work on **feature branches** → PR into `main`. No long-lived dev branch.

## CI/CD pipeline (`.github/workflows/ci.yml`)
1. **On every PR (and feature-branch push)** — run `check`: lint → type-check → test → build.
   - Render creates a **per-PR preview deploy** (temporary URL, torn down on merge/close).
2. **On merge to `main`** (a push event) — `check` runs again, then `deploy` POSTs the
   Render Deploy Hook → production builds & releases automatically.

Render `autoDeploy` is **off** for production, so prod only deploys via the
deploy hook after CI is green. Previews are the only auto-deploys.

```
feature branch ─push→ CI (lint/types/test/build) ─┐
                                                   ├─ Render PR preview (temp URL)
open PR ───────────────────────────────────────────┘
   │  review + CI green (required check)
   ▼
merge to main ─push→ CI ──(green)──► deploy job ──► Render Deploy Hook ──► prod release
```

**Gate to enforce:** make `check` a *required status check* in branch protection
(below) so a red PR cannot be merged. That is what makes "deploy to prod only
after a proper deploy/validation" real — CI + preview must pass before merge,
and merge is what triggers prod.

## One-time setup

### 1. GitHub — branch protection (makes the gate real)
Repo → Settings → Branches → Add rule for `main`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass → select **`Lint · Types · Test · Build`** (the `check` job)
- ✅ Require branches to be up to date before merging
- (optional) ✅ Require approvals

Without this, someone can push straight to `main` or merge a red PR. With it,
prod can only be reached through a green PR.

### 2. Render
- New → **Blueprint**, point at this repo (`render.yaml` is detected).
- Confirm **Pull Request Previews** is enabled (the blueprint sets
  `previews.generation: automatic`).
- Set all `sync: false` env vars in the Render dashboard (values from your `.env`; see `.env.example`).
- Settings → **Deploy Hook**: copy the URL.

> Preview deploys inherit env vars from the main service. Preview-specific
> values (e.g. a distinct `NEXT_PUBLIC_APP_URL`) can be overridden per-PR, but
> previews share the same Supabase project/DB — be careful with writes from a
> preview against production data.

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
