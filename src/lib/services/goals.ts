import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateGoalInput } from "@/lib/schemas/goal";
import type { Goal, GoalRow } from "@/types";

// All functions take the request-scoped client (anon key + the user's JWT), so every query below is
// subject to row-level security. Never pass a service-role client here.

function toGoal(row: GoalRow): Goal {
  const timing: Goal["timing"] =
    row.kind === "one_off" && row.deadline ? { kind: "one_off", deadline: row.deadline } : { kind: "recurring" };

  const endCondition: Goal["endCondition"] =
    row.end_target_value !== null && row.end_minimum_value !== null && row.end_unit !== null
      ? { targetValue: row.end_target_value, minimumValue: row.end_minimum_value, unit: row.end_unit }
      : null;

  // The CHECK constraints guarantee the columns for the active mode are set; the fallbacks only satisfy the types.
  const schedule: Goal["schedule"] =
    row.schedule_mode === "fixed_days"
      ? { mode: "fixed_days", days: row.fixed_days ?? [] }
      : { mode: "flexible", target: row.freq_target ?? 0, minimum: row.freq_minimum ?? 0 };

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    timing,
    endCondition,
    schedule,
    category: row.category,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createGoal(
  supabase: SupabaseClient,
  userId: string,
  input: CreateGoalInput,
): Promise<{ id: string }> {
  const result = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      name: input.name,
      kind: input.timing.kind,
      deadline: input.timing.kind === "one_off" ? input.timing.deadline : null,
      end_target_value: input.endCondition?.targetValue ?? null,
      end_minimum_value: input.endCondition?.minimumValue ?? null,
      end_unit: input.endCondition?.unit ?? null,
      schedule_mode: input.schedule.mode,
      freq_target: input.schedule.mode === "flexible" ? input.schedule.target : null,
      freq_minimum: input.schedule.mode === "flexible" ? input.schedule.minimum : null,
      fixed_days: input.schedule.mode === "fixed_days" ? input.schedule.days : null,
      category: input.category,
      priority: input.priority,
    })
    .select("id")
    .single();

  if (result.error) throw result.error;
  return { id: (result.data as Pick<GoalRow, "id">).id };
}

export async function listGoals(supabase: SupabaseClient): Promise<Goal[]> {
  const result = await supabase
    .from("goals")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (result.error) throw result.error;
  return (result.data as GoalRow[]).map(toGoal);
}

/** Returns `null` when no row is visible, whether it doesn't exist or RLS hides it. */
export async function getGoal(supabase: SupabaseClient, id: string): Promise<Goal | null> {
  const result = await supabase.from("goals").select("*").eq("id", id).maybeSingle();

  if (result.error) throw result.error;
  return result.data ? toGoal(result.data as GoalRow) : null;
}
