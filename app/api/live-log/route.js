import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getServerSupabase = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables for /api/live-log");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const toNullableNumber = (val) => {
  const t = String(val ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const ensureObj = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});

const sanitizeAthleteWorkoutPayload = (payload = {}) => ({
  program_id: payload.program_id,
  week_number: Number(payload.week_number) || 1,
  day_label: String(payload.day_label ?? "").trim(),
  exercise_name: String(payload.exercise_name ?? "").trim(),
  exercise_index: Number(payload.exercise_index ?? 0),
  exercise_uid: payload.exercise_uid ? String(payload.exercise_uid) : null,
  exercise_name_snapshot: payload.exercise_name_snapshot
    ? String(payload.exercise_name_snapshot)
    : payload.exercise_name
      ? String(payload.exercise_name)
      : null,
  actual_sets: String(payload.actual_sets ?? "0"),
  actual_reps: String(payload.actual_reps ?? ""),
  actual_weight: String(payload.actual_weight ?? ""),
  athlete_notes: String(payload.athlete_notes ?? ""),
  athlete_metrics: ensureObj(payload.athlete_metrics),
  completed: Boolean(payload.completed),
  rpe: toNullableNumber(payload.rpe),
});

const sanitizeAthleteUpdateFields = (updates = {}) => {
  const out = {};

  if (Object.prototype.hasOwnProperty.call(updates, "actual_sets")) out.actual_sets = String(updates.actual_sets ?? "0");
  if (Object.prototype.hasOwnProperty.call(updates, "actual_reps")) out.actual_reps = String(updates.actual_reps ?? "");
  if (Object.prototype.hasOwnProperty.call(updates, "actual_weight")) out.actual_weight = String(updates.actual_weight ?? "");
  if (Object.prototype.hasOwnProperty.call(updates, "athlete_notes")) out.athlete_notes = String(updates.athlete_notes ?? "");
  if (Object.prototype.hasOwnProperty.call(updates, "athlete_metrics")) out.athlete_metrics = ensureObj(updates.athlete_metrics);
  if (Object.prototype.hasOwnProperty.call(updates, "completed")) out.completed = Boolean(updates.completed);
  if (Object.prototype.hasOwnProperty.call(updates, "rpe")) out.rpe = toNullableNumber(updates.rpe);

  return out;
};

const findExistingWorkoutLog = async (supabase, payload) => {
  let query = supabase
    .from("workout_logs")
    .select("id, created_at, exercise_uid")
    .eq("program_id", payload.program_id)
    .eq("week_number", payload.week_number)
    .eq("day_label", payload.day_label)
    .eq("exercise_index", payload.exercise_index)
    .order("created_at", { ascending: false })
    .limit(1);

  if (payload.exercise_uid) {
    query = query.eq("exercise_uid", payload.exercise_uid);
  }

  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) && data.length ? data[0] : null;
};

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = String(body?.mode || "upsert").trim().toLowerCase();
    const supabase = getServerSupabase();

    if (mode === "upsert") {
      const payload = sanitizeAthleteWorkoutPayload(body?.payload || {});
      let existingId = body?.existingId ? String(body.existingId) : null;

      if (!payload.program_id || !payload.day_label || !payload.exercise_name) {
        return NextResponse.json({ error: "Missing required workout log fields" }, { status: 400 });
      }

      if (!existingId) {
        const existing = await findExistingWorkoutLog(supabase, payload);
        existingId = existing?.id || null;
      }

      const query = existingId
        ? supabase.from("workout_logs").update(payload).eq("id", existingId)
        : supabase.from("workout_logs").insert([payload]);

      const { data, error } = await query.select("*").single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data, matchedExisting: Boolean(existingId) });
    }

    if (mode === "update") {
      const id = body?.id ? String(body.id) : "";

      if (!id) {
        return NextResponse.json({ error: "Missing log id" }, { status: 400 });
      }

      const updates = sanitizeAthleteUpdateFields(body?.updates || {});

      if (!Object.keys(updates).length) {
        return NextResponse.json({ error: "No allowed update fields supplied" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("workout_logs")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data });
    }

    if (mode === "delete") {
      const id = body?.id ? String(body.id) : "";

      if (!id) {
        return NextResponse.json({ error: "Missing log id" }, { status: 400 });
      }

      const { error } = await supabase.from("workout_logs").delete().eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: `Unsupported mode: ${mode}` }, { status: 400 });
  } catch (err) {
    console.error("[/api/live-log] error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error in /api/live-log" },
      { status: 500 }
    );
  }
}