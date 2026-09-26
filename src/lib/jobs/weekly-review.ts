import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";

/**
 * Entry point for the weekly Review generator, invoked by the Cloudflare
 * Workers Cron Trigger defined in `wrangler.jsonc` (`triggers.crons`) via the
 * `scheduled` handler in `src/worker.ts`.
 *
 * Runs outside any user request, so once implemented it should use a
 * service-role Supabase client (`createClient` from `@supabase/supabase-js`
 * with `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS) rather than the
 * cookie-based SSR client in `src/lib/supabase.ts`.
 *
 * TODO: once the goals/streaks/XP data model lands (see PRD), page through
 * users, compute each user's weekly goal completion, streak deltas and XP
 * earned, and upsert the result into a `weekly_reviews` table (or wherever
 * the PRD lands it).
 */
export function runWeeklyReviewJob(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("weekly-review: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured, skipping run");
    return Promise.resolve();
  }

  console.log("weekly-review: cron fired — generation logic not yet implemented, pending the goals/streaks schema");
  return Promise.resolve();
}
