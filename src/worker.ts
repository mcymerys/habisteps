import astroHandler from "@astrojs/cloudflare/entrypoints/server";
import { runWeeklyReviewJob } from "@/lib/jobs/weekly-review";

/**
 * Custom Worker entrypoint (see `wrangler.jsonc` `main`). Wraps the Astro
 * Cloudflare adapter's own `fetch` handler and adds a `scheduled` handler for
 * the Cron Trigger declared in `wrangler.jsonc` (`triggers.crons`).
 *
 * The adapter's default entrypoint (`@astrojs/cloudflare/entrypoints/server`)
 * only exports `fetch`; Cloudflare's edge runtime doesn't support
 * long-running in-request jobs, so the weekly Review generator runs here
 * instead, off the request path, on its own schedule.
 */
export default {
  ...astroHandler,
  scheduled(_event, _env, ctx) {
    ctx.waitUntil(runWeeklyReviewJob());
  },
} satisfies ExportedHandler;
