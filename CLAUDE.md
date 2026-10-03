## Project: habistep

This file provides guidance to AI Agent when working with code in this repository.

### Commands

See `@README.md` ("Available Scripts") for `npm run dev/build/preview/lint/lint:fix/format/smoke`.

Pre-commit hooks: husky + lint-staged runs `eslint --fix` on `*.{ts,tsx,astro}` and `prettier --write` on `*.{json,css,md}`.

### Architecture

**Astro 7 SSR app** with React 19 islands, Tailwind 4, Supabase auth, and shadcn/ui components. Deployed to Cloudflare Workers.

#### Rendering mode

Full server-side rendering (`output: "server"` in astro.config.mjs). All pages are server-rendered by default. API routes must export `const prerender = false`.

#### Auth flow

- `src/lib/supabase.ts` — creates a Supabase SSR client using `@supabase/ssr` with cookie-based sessions. Uses `astro:env/server` for `SUPABASE_URL` and `SUPABASE_KEY` (server-only secrets declared in astro.config.mjs `env.schema`).
- `src/middleware.ts` — runs on every request, resolves the current user, attaches to `context.locals.user`. Redirects unauthenticated users away from routes listed in `PROTECTED_ROUTES`.
- API endpoints: `src/pages/api/auth/{signin,signup,signout}.ts`
- Auth pages: `src/pages/auth/{signin,signup,confirm-email}.astro`
- Protected page example: `src/pages/dashboard.astro`

#### Key conventions

- **Path alias**: `@/*` maps to `./src/*` (tsconfig paths).
- **Tailwind class merging**: use the `cn()` helper from `@/lib/utils` (clsx + tailwind-merge) for conditional/merged class names. Do not concatenate class strings manually.
- **shadcn/ui**: components live in `src/components/ui/`, "new-york" style variant. Install new ones with `npx shadcn@latest add [name]`.
- **API routes**: use uppercase `GET`, `POST` exports; validate input with zod.
- **Supabase migrations**: `supabase/migrations/` using naming format `YYYYMMDDHHmmss_short_description.sql`. Always enable RLS on new tables with granular per-operation, per-role policies.
- **React**: no Next.js directives ("use client" etc.). Extract hooks to `src/components/hooks/`.
- **Services/helpers** go in `src/lib/` (or `src/lib/services/` for extracted business logic).
- **Shared types** (entities, DTOs) go in `src/types.ts`.

#### Environment

- Node.js v22.14.0 (see `.nvmrc`)
- Env vars: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (copy `.env.example` to `.env` for Node, or `.dev.vars` for Cloudflare local dev)
- Local Supabase: `npx supabase start` (requires Docker)
- Cloudflare local dev: secrets go in `.dev.vars` (gitignored)
- Deploy: `npx wrangler deploy` (requires Cloudflare account + `wrangler` auth)

#### Background jobs (Cron Triggers)

Cloudflare's edge runtime doesn't support long-running in-request jobs, so scheduled work (the weekly Review generator) runs via a Cloudflare Workers **Cron Trigger** instead of an in-request handler:

- `wrangler.jsonc` `main` points at `src/worker.ts` (not the adapter's default entrypoint) and declares `triggers.crons`.
- `src/worker.ts` spreads Astro's own Cloudflare `fetch` handler and adds a `scheduled` export, which calls into the job.
- `src/lib/jobs/weekly-review.ts` holds the job body. It currently only validates env and logs — the actual goal/streak/XP generation logic is a TODO pending that data model.
- The job needs `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) since it runs with no user/cookie context; never expose that key client-side.
- Test locally with `npx wrangler dev --test-scheduled`, then trigger the cron with `curl "http://localhost:8787/__scheduled?cron=0+6+*+*+1"`.
- Adding a new scheduled job: add its logic under `src/lib/jobs/`, call it from `src/worker.ts`'s `scheduled` handler (via `ctx.waitUntil(...)` so the Worker doesn't exit early), and add/adjust the cron expression in `wrangler.jsonc`.

### CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs three jobs:

- **ci** (every push and PR to master) — lint, `astro check`, and build. Requires `SUPABASE_URL` and `SUPABASE_KEY` repository secrets for the build step.
- **smoke** (every push and PR to master) — starts a local Supabase via the Supabase CLI, builds, serves the production preview on the Cloudflare runtime, and runs `npm run smoke` against it. No secrets required.
- **deploy** (push to master only, after `ci` and `smoke` pass) — builds and deploys the Worker via `cloudflare/wrangler-action`. Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets. Skipped on pull requests; `concurrency: production` prevents overlapping deploys.

`/10x-*` agent-context chain reference (Task Router, change-planning chain `/10x-new → /10x-plan → /10x-plan-review → /10x-implement`, skill capture rules, inclusion test): `@context/foundation/toolkit-guide.md`.

<!-- prettier-ignore-start -->
<!-- BEGIN @przeprogramowani/10x-cli -->

## Zestaw narzędzi AI 10xDevs — Moduł 2, Lekcja 5 (10xDevs 4.0 UI)

**W przypadku pracy nad UI w widoku, który już się renderuje, użyj `/10x-ui`.** Przeprowadza ono zmianę wizualną przez ten sam łańcuch co każdą inną zmianę (`/10x-new` → `/10x-research` →
`/10x-plan` → `/10x-implement` → `/10x-impl-review`) i obejmuje zasady:
kiedy rozpocząć pracę i którego widoku dotyczy, audyt pod kątem opłat, kontrakt systemu projektowego w formie, w jakiej realizuje go to repozytorium, stany komponentów, bramkę zrzutu ekranu oraz regułę, która utrzymuje kolejnego agenta przy kontrakcie. W jego `references/` znajduje się lista kontrolna jakości.

Tworzenie widoku po raz pierwszy nie jest zadaniem dla `/10x-ui` — zbuduj go poprzez
zwykły łańcuch, a następnie wróć do niego z `/10x-ui`.

<!-- END @przeprogramowani/10x-cli -->
<!-- prettier-ignore-end -->
