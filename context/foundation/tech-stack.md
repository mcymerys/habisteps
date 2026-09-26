---
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
---

## Why this stack

Habistep is a solo, after-hours web-app MVP with a 6-week timeline that needs auth, a Postgres-backed data model (goals, streaks, XP, friends), and a weekly scheduled job to generate every user's Weekly Review without manual intervention. The 10x Astro Starter is the recommended default for `(web-app, js)`, clears all four agent-friendly gates, and ships auth + database + edge deploy out of the box via Supabase and Cloudflare — a good match for the short timeline and solo team profile. Cloudflare Workers Cron Triggers cover the weekly-review background job that the starter's edge runtime doesn't handle out of the box for long-running tasks; this is a known gotcha worth revisiting once the project is scaffolded. Deployment defaults to Cloudflare Pages (the starter's own default), and CI runs on GitHub Actions with auto-deploy-on-merge — the standard shape for a solo project moving fast.
