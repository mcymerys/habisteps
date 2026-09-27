# Pierwsze wdrożenie habistep na Cloudflare Workers

## Context

`context/foundation/infrastructure.md` wybiera Cloudflare Workers, a `tech-stack.md` zakłada CI na GitHub Actions z `ci_default_flow: auto-deploy-on-merge`. Kod jest już przygotowany pod Workers (`wrangler.jsonc` → `main: src/worker.ts`, cron `0 6 * * 1`, `nodejs_compat`), ale aplikacja **nigdy nie została wdrożona**:

- `wrangler whoami` zwraca „not authenticated”,
- `.env` i `.dev.vars` wskazują na lokalny Supabase (`127.0.0.1:54321`),
- Worker nadal ma nazwę szablonu (`10x-astro-starter`),
- `.github/workflows/ci.yml` tylko buduje i uruchamia testy, niczego nie wdraża,
- `gh` nie jest zalogowany.

Decyzje użytkownika: **zakładamy nowy hostowany projekt Supabase** (z prowadzeniem krok po kroku), a zakres to **ręczne wdrożenie, a potem auto-deploy w CI**.

Uwaga: w `tech-stack.md` jest `deployment_target: cloudflare-pages`, ale projekt używa **Workers ze static assets** (`assets.directory: ./dist`). To obecny zalecany przez Cloudflare następca Pages. Nie zmieniamy tego.

Weryfikacja w kodzie: `@astrojs/cloudflare` wywołuje `setGetEnv(createGetEnv(env z "cloudflare:workers"))` na poziomie modułu (`node_modules/@astrojs/cloudflare/dist/utils/handler.js:31`). Dzięki temu `astro:env/server` działa także w handlerze `scheduled`, a sekrety z `wrangler secret` trafią do joba weekly-review.

## Krok 1: zmiana w kodzie przed pierwszym deployem

`wrangler.jsonc`: `"name": "10x-astro-starter"` → `"name": "habistep"`.
Dlaczego teraz: nazwa Workera to jego tożsamość na koncie Cloudflare i część URL-a (`habistep.<subdomena>.workers.dev`). Zmiana nazwy po wdrożeniu utworzyłaby drugi Worker, a stary trzeba by ręcznie usunąć razem z jego sekretami i cronem.

## Krok 1b: nowy projekt Supabase (użytkownik w dashboardzie, ja prowadzę)

Dlaczego dashboard, a nie `supabase projects create` z CLI: to jednorazowa operacja, a w dashboardzie od razu widać region, plan i hasło bazy. CLI przyda się dopiero do migracji (patrz `link` niżej).

1. https://supabase.com/dashboard → zaloguj się (np. przez GitHub) → utwórz organizację, jeśli jeszcze jej nie masz (plan **Free**).
2. **New project**:
   - Name: `habistep`
   - Database Password: kliknij **Generate**, zapisz w menedżerze haseł (potrzebne do `supabase link` / `db push`; nie trafia do aplikacji)
   - Region: **Central EU (Frankfurt)**, najbliżej użytkowników w PL. Supabase nie jest „na edge”, więc Worker i tak łączy się z jednym regionem.
   - Poczekaj ~1–2 min na provisioning.
3. Klucze: Project Settings → **API Keys** (nowe klucze):
   - `SUPABASE_URL` = Project URL (`https://<ref>.supabase.co`, widoczny w Project Settings → Data API / Overview)
   - `SUPABASE_KEY` = **publishable key** (`sb_publishable_...`), odpowiednik dawnego `anon`, bezpieczny dla RLS
   - `SUPABASE_SERVICE_ROLE_KEY` = **secret key** (`sb_secret_...`), odpowiednik dawnego `service_role`, **omija RLS**, tylko do joba cron
   - (Jeśli projekt pokazuje tylko zakładkę „Legacy API keys”, to `anon` i `service_role` też działają z `@supabase/supabase-js`.)
   - Wartości wklejasz **tylko** do `.env.production` (Krok 3), nie do czatu.
4. Podpięcie repo do projektu (dla przyszłych migracji): `! npx supabase login` (przeglądarka), potem ja uruchamiam `npx supabase link --project-ref <ref>` (poprosi o hasło bazy, więc to wpisujesz Ty). Migracji jeszcze nie ma, więc na razie nic nie pushujemy. `link` przygotowuje grunt pod `npx supabase db push`, gdy pojawią się tabele goals/streaks/XP.

## Krok 2: logowanie (użytkownik, interaktywnie)

- `! npx wrangler login` otwiera przeglądarkę z OAuth. Potem sprawdzam `npx wrangler whoami`. Jeśli kont jest kilka, zapisuję `account_id`.

## Krok 3: sekrety produkcyjne bez pokazywania ich w czacie

1. Użytkownik tworzy plik `.env.production`. Jest już w `.gitignore:17`, więc nie trafi do repo. Zawiera `SUPABASE_URL`, `SUPABASE_KEY` (publishable) i `SUPABASE_SERVICE_ROLE_KEY` (secret) z nowego projektu (Krok 1b).
2. Deploy: `npm run build`, potem `npx wrangler deploy`. Pierwszy deploy tworzy Workera. Bez sekretów aplikacja działa w trybie „Supabase nie jest skonfigurowany” (`src/lib/config-status.ts`), więc nic się nie wysypie.
3. `npx wrangler secret bulk .env.production` wgrywa wszystkie 3 sekrety naraz i automatycznie tworzy nową wersję. Dlaczego `bulk` z pliku, a nie `secret put` x3: klucze nie przechodzą przez historię shella ani przez tę rozmowę. `wrangler secret bulk --help` potwierdza obsługę formatu `.env`.
4. `npx wrangler secret list` sprawdza, czy są wszystkie 3 nazwy.

## Krok 4: konfiguracja Auth w hostowanym Supabase (użytkownik, w dashboardzie)

- Authentication → URL Configuration: **Site URL** = `https://habistep.<subdomena>.workers.dev`, a w **Redirect URLs** dodajemy `https://habistep.<subdomena>.workers.dev/**`. Bez tego link potwierdzający z maila przekieruje na `localhost`.
- W repo nie ma jeszcze migracji (`supabase/migrations/` nie istnieje), więc `supabase db push` nie jest potrzebny.
- Uwaga: w hostowanym projekcie „Confirm email” jest domyślnie włączone, a wbudowany SMTP ma niski limit wysyłki (kilka maili na godzinę). Na potrzeby MVP to wystarczy.

## Krok 5: weryfikacja ręcznego wdrożenia

- `curl -sI https://habistep.<sub>.workers.dev/` → 200, `/dashboard` → 302 na `/auth/signin`.
- Użytkownik ręcznie przechodzi w przeglądarce: signup na prawdziwy e-mail → potwierdzenie → signin → `/dashboard` → signout.
- **Nie** uruchamiamy `npm run smoke` na produkcji. Zakłada on konta `smoke-*@example.com`, co przy włączonym potwierdzaniu maili zablokuje logowanie, a w produkcyjnej bazie zostaną śmieciowe konta.
- Cron: `npx wrangler triggers` / dashboard pokazuje `0 6 * * 1`. Log joba widać w `npx wrangler tail --format pretty`. Najbliższy przebieg jest w poniedziałek o 06:00 UTC. Lokalnie job da się sprawdzić przez `wrangler dev --test-scheduled` (instrukcja w CLAUDE.md).

## Krok 6: auto-deploy w GitHub Actions

`.github/workflows/ci.yml`: dodaję trzeci job `deploy`.

```yaml
deploy:
  needs: [ci, smoke]
  if: github.event_name == 'push' && github.ref == 'refs/heads/master'
  runs-on: ubuntu-latest
  concurrency: production
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 22, cache: npm }
    - run: npm ci
    - run: npm run build
    - uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        command: deploy
```

- `needs` + `if`: deploy rusza tylko po pushu/merge'u do master i tylko wtedy, gdy lint, check, build i smoke przeszły. Pull requesty nigdy nie wdrażają.
- `concurrency: production`: dwa szybkie pushe nie wdrożą się równolegle.
- `wrangler deploy` nie nadpisuje sekretów, bo zostają w Cloudflare. CI nie potrzebuje kluczy Supabase.
- Użytkownik tworzy **wąsko ograniczony** API token (Cloudflare → My Profile → API Tokens → szablon „Edit Cloudflare Workers”, tylko to jedno konto), zgodnie z Risk Register w infrastructure.md.
- Sekrety GitHub (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) ustawiamy przez GitHub → Settings → Secrets → Actions albo przez `! gh auth login`, a potem `! gh secret set ...`. Przy okazji sprawdzamy, czy są `SUPABASE_URL` i `SUPABASE_KEY`, których wymaga istniejący job `ci`. Bez nich CI nie przejdzie i deploy się nie uruchomi.

## Krok 7: dokumentacja

- `README.md` (sekcja „Deployment”, linie ~152–168): dopisuję `wrangler secret bulk`, konfigurację Site URL w Supabase, rollback (`npx wrangler deployments list` / `npx wrangler rollback`) i opis auto-deployu.
- `CLAUDE.md` (sekcja CI): dopisuję trzeci job `deploy` i sekrety `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.

## Krok 8: commit i weryfikacja CI

- Commit na branchu `deploy/first-deployment` (nie bezpośrednio na master), push, PR. Na PR-ze job `deploy` ma być **pominięty**.
- Po merge'u w Actions sprawdzamy, że job `deploy` przeszedł, a `npx wrangler deployments list` pokazuje nową wersję z CI.

## Pliki do zmiany

- `wrangler.jsonc` (nazwa Workera)
- `.github/workflows/ci.yml` (job `deploy`)
- `README.md`, `CLAUDE.md` (dokumentacja)
- `.env.production` tworzy użytkownik lokalnie; jest gitignorowany i nie jest commitowany

## Poza zakresem (świadomie)

- Własna domena, `site` w `astro.config.mjs` dla sitemapy (dodamy razem z domeną).
- Preview deploys per PR, Cloudflare Access.
- Plan Workers Paid ($5/mies.): infrastructure.md każe przejść na niego dopiero przed zaimplementowaniem prawdziwej logiki weekly-review.

## Status realizacji

Branch: `deploy/first-deployment`

- [ ] Krok 1: `wrangler.jsonc` → `"name": "habistep"`
- [ ] Krok 1b: nowy projekt Supabase + `supabase link`
- [ ] Krok 2: `wrangler login`
- [ ] Krok 3: pierwszy `wrangler deploy` + `wrangler secret bulk .env.production`
- [ ] Krok 4: Site URL / Redirect URLs w Supabase Auth
- [ ] Krok 5: weryfikacja ręcznego wdrożenia
- [ ] Krok 6: job `deploy` w `.github/workflows/ci.yml` (kod gotowy; brak sekretów `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` w GitHub)
- [ ] Krok 7: dokumentacja (`README.md`, `CLAUDE.md`)
- [ ] Krok 8: commit, PR, merge, weryfikacja auto-deployu
