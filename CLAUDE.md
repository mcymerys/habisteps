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

<!-- BEGIN @przeprogramowani/10x-cli -->

## Zestaw narzędzi AI 10xDevs — Moduł 2, Lekcja 3

Przejrzyj kod wygenerowany przez AI przed scaleniem, korzystając z **łańcucha przeglądu implementacji**:

```
/10x-implement -> /10x-impl-review -> triage -> (/10x-lesson | fix | skip | disagree)
```

`/10x-impl-review` jest głównym tematem lekcji. Przegląd jest bramką jakości, a nie poleceniem naprawienia każdego znaleziska.

### Router zadań — od czego zacząć

| Umiejętność                             | Użyj jej, gdy                                                                                                                                                                                                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Przegląd kodu (główny temat lekcji)** |                                                                                                                                                                                                                                                                                  |
| `/10x-impl-review <change-id>`          | Zaimplementowano kod i chcesz przeprowadzić ustrukturyzowany przegląd przed scaleniem. Umiejętność sprawdza zgodność z planem, dyscyplinę zakresu, bezpieczeństwo i jakość, architekturę, spójność wzorców oraz kryteria sukcesu, a następnie przedstawia ustalenia do selekcji. |
| **Wynik powtarzającej się lekcji**      |                                                                                                                                                                                                                                                                                  |
| `/10x-lesson`                           | Ustalenie ujawnia powtarzającą się regułę projektu lub wzorzec błędów agenta. Zapisz je w `context/foundation/lessons.md` zamiast traktować je jako jednorazową notatkę.                                                                                                         |

### Dyscyplina selekcji

- Dotkliwość określa, jak poważne jest ustalenie. Wpływ określa, jak duże znaczenie ma teraz decyzja.
- Prawidłowe wyniki: napraw teraz, napraw inaczej, pomiń, zaakceptuj jako ryzyko, zapisz jako powtarzającą się regułę (`/10x-lesson`), nie zgódź się.
- Naprawiaj krytyczne ustalenia. Nie poświęcaj godzin na obserwacje o niskim wpływie tylko dlatego, że agent je znalazł.
- Świadome pomijanie ustaleń o niskim wpływie jest prawidłowym wynikiem przeglądu, a nie zaniedbaniem.
- Jeśli nie zgadzasz się z ustaleniem, zapisz dlaczego. Błędne rozumowanie agenta również jest sygnałem.

### Granice przeglądu

- Ta lekcja dotyczy przeglądu zaimplementowanego kodu. Nie tworzy planu, nie wykonuje nowych faz ani nie uczy przeglądu CI.
- Strategia testowania i bramki jakości zostaną wprowadzone w Module 3.
- Nie używaj `/10x-contract` jako wyniku selekcji w tej lekcji.

### Ścieżki używane przez tę lekcję

- `context/changes/<change-id>/plan.md` — oczekiwany kontrakt implementacji
- `context/changes/<change-id>/reviews/` — wynik przeglądu
- `context/foundation/lessons.md` — powtarzające się lekcje

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: "Ta zmiana jest zarchiwizowana. Zamiast tego otwórz nową zmianę za pomocą `/10x-new`."
<!-- END @przeprogramowani/10x-cli -->

`/10x-*` agent-context chain reference (Task Router, change-planning chain `/10x-new → /10x-plan → /10x-plan-review → /10x-implement`, skill capture rules, inclusion test): `@context/foundation/toolkit-guide.md`.
