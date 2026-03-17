import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getServerSupabase = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables for /api/live-log-read");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = String(searchParams.get("programId") || "").trim();
    const weekNumberRaw = searchParams.get("weekNumber");

    if (!programId) {
      return NextResponse.json({ error: "Missing programId" }, { status: 400 });
    }

    const supabase = getServerSupabase();

    let query = supabase
      .from("workout_logs")
      .select(
        "id, created_at, program_id, week_number, day_label, exercise_name, exercise_index, exercise_uid, exercise_name_snapshot, actual_sets, actual_reps, actual_weight, athlete_notes, athlete_metrics, completed, rpe"
      )
      .eq("program_id", programId)
      .order("created_at", { ascending: false });

    if (weekNumberRaw !== null && weekNumberRaw !== undefined && weekNumberRaw !== "") {
      query = query.eq("week_number", Number(weekNumberRaw) || 1);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error("[/api/live-log-read] error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error in /api/live-log-read" },
      { status: 500 }
    );
  }
}