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

## Zestaw narzędzi AI 10xDevs — Moduł 2, Lekcja 4

Przygotuj się na trudniejszy strumień implementacji z **łańcuchem planowania opartym na badaniach**:

```
internal research (/10x-research) + external research (exa.ai, Context7) -> /10x-plan -> /10x-implement -> success
```

Lekcja koncentruje się na rozróżnianiu badań wewnętrznych od zewnętrznych oraz wykorzystywaniu dowodów do uzasadniania decyzji planistycznych.

### Router zadań — od czego zacząć

| Umiejętność | Użyj jej, gdy |
| --- | --- |
| **Badania wewnętrzne (temat lekcji)** | |
| `/10x-research <change-id>` | Potrzebujesz dowodów z istniejącej bazy kodu — wzorców, konwencji, punktów integracji lub istniejących implementacji. Uruchamia równoległe subagentów w repozytorium i zapisuje ustrukturyzowane ustalenia w `research.md`. |
| **Badania zewnętrzne (temat lekcji)** | |
| exa.ai | Potrzebujesz natywnego dla AI wyszukiwania w sieci do porównywania bibliotek, sprawdzonych praktyk lub kontekstu ekosystemu, na które baza kodu nie może odpowiedzieć. |
| Context7 (`resolve-library-id` → `get-library-docs`) | Potrzebujesz aktualnej, bieżącej dokumentacji dla konkretnej biblioteki lub frameworka. Najpierw rozwiązuje identyfikator biblioteki, a następnie pobiera odpowiednie strony dokumentacji. |
| **Koło zapasowe do ramowania problemu** | |
| `/10x-frame <change-id>` | Plan nie może się ustabilizować, plan nie przynosi oczekiwanych rezultatów lub utrzymujący się dryf ciągle psuje implementację. Użyj jako wyjścia awaryjnego dla osobnego problemu (zademonstrowanego na przykładzie Space Explorers), a nie jako rytuału przed badaniami. |
| **Planowanie i wykonanie** | |
| `/10x-plan <change-id>` / `/10x-implement <change-id> phase <n>` | Użyj tego samego łańcucha planowania i wykonania co w Lekcji 2, teraz z dowodami z wcześniejszych badań zasilającymi plan. |

### Dyscyplina badawcza

- Badania wewnętrzne (`/10x-research`) odpowiadają na pytanie „co nasza baza kodu już robi?” — wzorce, schematy, konwencje, punkty integracji.
- Badania zewnętrzne (exa.ai, Context7) odpowiadają na pytanie „co powinniśmy zrobić?” — możliwości bibliotek, dokumentacja API, sprawdzone praktyki ekosystemu.
- Połącz oba rodzaje jako dane wejściowe do `/10x-plan` poparte dowodami. Plan bez dowodów badawczych dla nietrywialnego strumienia to zgadywanie.
- Dokumentacja przyjazna agentom (`llms.txt`, markdown-for-agents, endpointy `/md`) jest sygnałem jakości przy wyborze biblioteki — biblioteki publikujące dokumentację czytelną dla agentów integrują się szybciej.

### `/10x-frame` jako koło zapasowe

Trzy sygnały, że należy sięgnąć po `/10x-frame`:
1. Plan nie może się ustabilizować — badania otwierają coraz więcej pytań zamiast zawężać je do kontraktu.
2. Plan nie przynosi rezultatów — implementacja wielokrotnie nie spełnia kryteriów sukcesu.
3. Utrzymujący się dryf — implementacja ciągle odbiega od planu w sposób sugerujący, że problem został błędnie ujęty.

Zademonstrowano na przykładzie Space Explorers, a nie na ścieżce SRS. Jest to wyjście awaryjne, a nie obowiązkowy krok.

### Ścieżki używane w tej lekcji

- `context/changes/<change-id>/research.md` - wynik badań wewnętrznych
- `context/changes/<change-id>/frame.md` - wynik ramowania problemu, gdy jest potrzebny
- `context/changes/<change-id>/plan.md` - kontrakt implementacyjny poparty dowodami
- `context/foundation/lessons.md` - powtarzające się reguły i pułapki

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: „This change is archived. Open a new change with `/10x-new` instead.”

<!-- END @przeprogramowani/10x-cli -->
<!-- prettier-ignore-end -->
