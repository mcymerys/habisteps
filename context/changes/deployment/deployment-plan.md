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

## Krok 0: prerekwizyty (konta + konfiguracja CLI)

Stan maszyny sprawdzony 2026-09-27: Node v26.10.0, npm 11.19.1, Wrangler 4.131.1, Supabase CLI 2.117.0, gh 2.101.0, Docker 29.8.0, git 2.55. Menedżer wersji Node (nvm/fnm/volta) nie został wykryty.

### 0.1 Konta

| Konto                                  | Po co                            | Plan                                                    |
| -------------------------------------- | -------------------------------- | ------------------------------------------------------- |
| Cloudflare (dash.cloudflare.com)       | hosting Workera, sekrety, cron   | Free (Paid $5/mies. dopiero przed logiką weekly-review) |
| Supabase (supabase.com)                | baza Postgres + Auth             | Free                                                    |
| GitHub, dostęp do `mcymerys/habisteps` | PR, sekrety Actions, auto-deploy | —                                                       |

### 0.2 Node w wersji z `.nvmrc` (zalecane, nieblokujące)

Projekt deklaruje Node **22.14.0** (`.nvmrc`), a CI też używa 22. Lokalnie jest v26: build najpewniej przejdzie, ale jeśli lokalnie jest inna wersja niż w CI, błąd „u mnie działa, w CI nie” będzie trudny do zdiagnozowania. Zalecenie: **fnm** (Fast Node Manager), bo na Windows działa w PowerShell i Git Bash i sam czyta `.nvmrc`:

```powershell
winget install Schniz.fnm
# dodaj do profilu PowerShell ($PROFILE):  fnm env --use-on-cd | Out-String | Invoke-Expression
fnm install        # w katalogu projektu: instaluje wersję z .nvmrc
fnm use
node -v            # → v22.14.0
```

Alternatywa: nvm-windows (`winget install CoreyButler.NVMforWindows`, potem `nvm install 22.14.0` i `nvm use 22.14.0`). Po zmianie wersji Node uruchom `npm ci`, żeby natywne binarki (workerd, esbuild) pasowały do nowej wersji.

### 0.3 Zależności projektu = CLI Wranglera i Supabase

`wrangler` i `supabase` są w `devDependencies` (`package.json`), więc **nie instalujemy ich globalnie**. Uruchamiamy je zawsze przez `npx wrangler …` / `npx supabase …`. Dlaczego: wersję przypina `package-lock.json`, więc lokalnie i w CI działa dokładnie ta sama wersja CLI, a globalna instalacja rozjechałaby się z czasem.

```bash
npm ci                     # instaluje dokładnie to, co w package-lock.json
npx wrangler --version     # → 4.131.x
npx supabase --version     # → 2.117.x
```

### 0.4 Wrangler (Cloudflare): logowanie

```bash
npx wrangler login         # otwiera przeglądarkę → „Allow” → token OAuth zapisany lokalnie
npx wrangler whoami        # pokazuje e-mail, nazwę konta i Account ID
```

- Jeśli przeglądarka nie wraca do terminala (callback na `localhost:8976` blokuje firewall/VPN), użyj `npx wrangler login --device`: dostajesz kod do wpisania na stronie Cloudflare, bez callbacku na localhost.
- **Account ID** z `whoami` zapisz; przyda się jako sekret `CLOUDFLARE_ACCOUNT_ID` w GitHub (Krok 6). Przy kilku kontach Wrangler przy deployu zapyta, na które wdrażać.
- **Subdomena workers.dev:** na nowym koncie pierwszy `wrangler deploy` zapyta o rejestrację subdomeny (`<nazwa>.workers.dev`). Wybierz ją świadomie, bo stanie się częścią publicznego URL-a `habistep.<nazwa>.workers.dev`. Można ją też ustawić wcześniej w dashboardzie: Workers & Pages → Account details → Subdomain.
- Token OAuth z `wrangler login` daje pełny dostęp do konta. Jest tylko na Twoją maszynę. CI dostanie osobny, wąski API token (Krok 6).

### 0.5 Supabase CLI: logowanie

```bash
npx supabase login              # przeglądarka → generuje personal access token i zapisuje go lokalnie
npx supabase projects list      # weryfikacja: lista projektów (po Kroku 1b pojawi się habistep)
```

- `supabase login` jest potrzebny do `supabase link` i `supabase db push` (Krok 1b.4). Sama aplikacja go nie używa; runtime korzysta z kluczy API.
- `link` zapisuje referencję projektu w `supabase/.temp/`, który jest już w `supabase/.gitignore`.
- **Docker** jest potrzebny tylko do lokalnego `npx supabase start` (dev i job `smoke` w CI) oraz do `db diff`/`db pull`. Wdrożenie i `db push` go nie wymagają.

### 0.6 GitHub CLI: logowanie

```bash
gh auth login              # GitHub.com → protokół SSH (remote repo to git@github.com:…) → Login with a web browser
gh auth status             # weryfikacja
gh secret list             # czy są SUPABASE_URL / SUPABASE_KEY dla joba `ci`
```

`gh` posłuży do ustawienia sekretów Actions (`gh secret set NAZWA`, który pyta o wartość interaktywnie, więc nie trafia ona do historii shella) i do utworzenia PR-a. Jeśli nie chcesz logować `gh`, to samo zrobisz w przeglądarce: repo → Settings → Secrets and variables → Actions.

### 0.7 Checklista gotowości

| Sprawdzenie                  | Oczekiwany wynik                                   |
| ---------------------------- | -------------------------------------------------- |
| `node -v`                    | `v22.14.0` (zalecane)                              |
| `npx wrangler whoami`        | Twój e-mail + Account ID                           |
| `npx supabase projects list` | tabela projektów (może być pusta przed Krokiem 1b) |
| `gh auth status`             | `Logged in to github.com`                          |
| `git status`                 | branch `deploy/first-deployment`                   |

W Claude Code interaktywne logowania uruchamiasz z prefiksem `!` (np. `! npx wrangler login`), żeby wynik trafił do rozmowy.

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

## Krok 2: logowanie do Cloudflare

- Wykonane w ramach Kroku 0.4 (`npx wrangler login` + `npx wrangler whoami`). Tutaj tylko potwierdzam, że `whoami` pokazuje właściwe konto, zanim zrobimy pierwszy deploy.

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

- [ ] Krok 0: prerekwizyty (Node 22, `wrangler login`, `supabase login`, `gh auth login`)
- [ ] Krok 1: `wrangler.jsonc` → `"name": "habistep"`
- [ ] Krok 1b: nowy projekt Supabase + `supabase link`
- [ ] Krok 2: potwierdzenie konta Cloudflare (`wrangler whoami`)
- [ ] Krok 3: pierwszy `wrangler deploy` + `wrangler secret bulk .env.production`
- [ ] Krok 4: Site URL / Redirect URLs w Supabase Auth
- [ ] Krok 5: weryfikacja ręcznego wdrożenia
- [ ] Krok 6: job `deploy` w `.github/workflows/ci.yml` (kod gotowy; brak sekretów `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` w GitHub)
- [ ] Krok 7: dokumentacja (`README.md`, `CLAUDE.md`)
- [ ] Krok 8: commit, PR, merge, weryfikacja auto-deployu
