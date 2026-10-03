import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { createGoalSchema } from "@/lib/schemas/goal";
import { createGoal } from "@/lib/services/goals";
import type { ApiError, ApiValidationError, CreateGoalResponse } from "@/types";

export const prerender = false;

function json(body: CreateGoalResponse | ApiValidationError | ApiError, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  if (!locals.user) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "validation", fieldErrors: { _: ["Request body must be valid JSON"] } }, 400);
  }

  const parsed = createGoalSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join(".") : "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return json({ error: "validation", fieldErrors }, 400);
  }

  const supabase = createClient(request.headers, cookies);
  if (!supabase) {
    return json({ error: "server" }, 500);
  }

  try {
    const { id } = await createGoal(supabase, locals.user.id, parsed.data);
    return json({ id }, 201);
  } catch (error) {
    console.error("Failed to create goal", error);
    return json({ error: "server" }, 500);
  }
};
