---
bootstrapped_at: 2026-09-26T14:12:40Z
starter_id: 10x-astro-starter
starter_name: 10x Astro Starter (Astro + Supabase + Cloudflare)
project_name: habistep
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: habistep
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: true
```

### Why this stack

Habistep is a solo, after-hours web-app MVP with a 6-week timeline that needs auth, a Postgres-backed data model (goals, streaks, XP, friends), and a weekly scheduled job to generate every user's Weekly Review without manual intervention. The 10x Astro Starter is the recommended default for `(web-app, js)`, clears all four agent-friendly gates, and ships auth + database + edge deploy out of the box via Supabase and Cloudflare — a good match for the short timeline and solo team profile. Cloudflare Workers Cron Triggers cover the weekly-review background job that the starter's edge runtime doesn't handle out of the box for long-running tasks; this is a known gotcha worth revisiting once the project is scaffolded. Deployment defaults to Cloudflare Pages (the starter's own default), and CI runs on GitHub Actions with auto-deploy-on-merge — the standard shape for a solo project moving fast.

## Pre-scaffold verification

| Signal      | Value                                                     | Severity | Notes                                                                 |
| ----------- | ---------------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| npm package | not run                                                   | n/a      | `cmd_template` starts with `git clone`; no npm CLI package to resolve |
| GitHub repo | przeprogramowani/10x-astro-starter last pushed 2026-09-12 | fresh    | from card `docs_url`; `gh` CLI unavailable, fetched via GitHub REST API directly |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 21 (`.env.example`, `.github`, `.gitignore`, `.husky`, `.nvmrc`, `.prettierrc.json`, `.vscode`, `AGENTS.md`, `README.md`, `astro.config.mjs`, `components.json`, `eslint.config.js`, `node_modules`, `package-lock.json`, `package.json`, `public`, `scripts`, `src`, `supabase`, `tsconfig.json`, `wrangler.jsonc`)
**Conflicts (.scaffold siblings)**: `CLAUDE.md` (existing cwd file preserved; scaffold's copy landed as `CLAUDE.md.scaffold`)
**.gitignore handling**: moved silently (no `.gitignore` existed in cwd before scaffold)
**.bootstrap-scaffold cleanup**: deleted (cloned `.git/` was removed before move-up, per the `git-clone` strategy)

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW
**Direct vs transitive**: not applicable — 0 findings across 804 total dependencies (377 prod, 269 dev, 167 optional)

Clean tree. No CRITICAL, HIGH, MODERATE, or LOW findings to report.

## Hints recorded but not acted on

| Hint                    | Value               |
| ------------------------ | -------------------- |
| bootstrapper_confidence | first-class          |
| quality_override        | false                |
| path_taken               | standard             |
| self_check_answers       | null                 |
| team_size                | solo                 |
| deployment_target        | cloudflare-pages     |
| ci_provider               | github-actions       |
| ci_default_flow          | auto-deploy-on-merge |
| has_auth                  | true                 |
| has_payments              | false                |
| has_realtime              | false                |
| has_ai                    | false                |
| has_background_jobs       | true                 |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review the `CLAUDE.md.scaffold` sibling and decide which version of `CLAUDE.md` to keep (or merge the two) — the starter's own `CLAUDE.md` may carry stack-specific agent guidance worth folding in.
- Address the noted background-job gotcha: the starter's edge runtime doesn't handle long-running tasks, so the weekly Review generator needs a Cloudflare Workers Cron Trigger rather than an in-request job.
- Configure Supabase RLS early — the starter's own gotcha list flags this as an auth-gap risk if deferred.
