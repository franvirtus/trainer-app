"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";
import { MessageSquare, Calendar, ArrowLeft, Clock, Dumbbell } from "lucide-react";
import Link from "next/link";

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupLogs(logs) {
  const groups = new Map();

  for (const log of logs || []) {
    const key = `${log.week_number || 0}__${log.day_label || ""}`;
    if (!groups.has(key)) {
      groups.set(key, {
        week_number: log.week_number || 0,
        day_label: log.day_label || "",
        items: [],
      });
    }
    groups.get(key).items.push(log);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.week_number !== b.week_number) return b.week_number - a.week_number;
    return String(a.day_label).localeCompare(String(b.day_label), "it");
  });
}

export default function CoachReport() {
  const params = useParams();
  const programId = String(params?.id || "");

  const [logs, setLogs] = useState([]);
  const [programTitle, setProgramTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!programId) return;

    const fetchData = async () => {
      setLoading(true);
      setErrorMsg("");

      try {
        // 1) Scheda / programma
        const { data: program, error: programError } = await supabase
          .from("programs")
          .select("id, title, client_id")
          .eq("id", programId)
          .single();

        if (programError || !program) {
          throw new Error("Scheda non trovata.");
        }

        setProgramTitle(program.title || "Scheda");

        // 2) Nome cliente se disponibile
        if (program.client_id) {
          const { data: client } = await supabase
            .from("clients")
            .select("full_name")
            .eq("id", program.client_id)
            .single();

          setClientName(client?.full_name || "");
        } else {
          setClientName("");
        }

        // 3) Log reali della scheda
        const { data: feedbackData, error: logsError } = await supabase
          .from("workout_logs")
          .select("*")
          .eq("program_id", programId)
          .order("created_at", { ascending: false });

        if (logsError) {
          throw logsError;
        }

        setLogs(Array.isArray(feedbackData) ? feedbackData : []);
      } catch (err) {
        console.error("[report fetchData] error:", err);
        setLogs([]);
        setProgramTitle("");
        setClientName("");
        setErrorMsg(err?.message || "Errore caricamento report.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [programId]);

  const groupedLogs = useMemo(() => groupLogs(logs), [logs]);

  if (loading) {
    return <div className="p-10 text-center text-slate-400">Caricamento report...</div>;
  }

  if (errorMsg) {
    return <div className="p-10 text-center text-red-500">{errorMsg}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors font-bold text-sm"
        >
          <ArrowLeft size={16} /> Torna alla Dashboard
        </Link>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{programTitle || "Report scheda"}</h1>
          <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} />
              <span>Report attività atleta</span>
            </div>
            {clientName ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Atleta:</span>
                <span>{clientName}</span>
              </div>
            ) : null}
          </div>
        </div>

        {groupedLogs.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400">Nessun log trovato per questa scheda.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedLogs.map((group) => (
              <section key={`${group.week_number}-${group.day_label}`} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-purple-500" />
                  <h2 className="text-xl font-bold text-slate-800">
                    Settimana {group.week_number} · {group.day_label}
                  </h2>
                </div>

                <div className="space-y-4">
                  {group.items.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-purple-200 transition-all"
                    >
                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(log.created_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Dumbbell size={12} />
                          {log.exercise_name_snapshot || log.exercise_name || "Esercizio"}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mb-4 text-sm">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-slate-400 mb-1">Serie</div>
                          <div className="font-semibold text-slate-700">{log.actual_sets || "-"}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-slate-400 mb-1">Ripetizioni</div>
                          <div className="font-semibold text-slate-700">{log.actual_reps || "-"}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-slate-400 mb-1">Peso</div>
                          <div className="font-semibold text-slate-700">{log.actual_weight || "-"}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-500 mb-1">Note atleta</div>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {String(log.athlete_notes || "").trim() || "—"}
                          </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-semibold text-slate-500">Completato: </span>
                            <span className="text-slate-700">{log.completed ? "Sì" : "No"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">RPE atleta: </span>
                            <span className="text-slate-700">{log.rpe ?? "—"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">RPE PT: </span>
                            <span className="text-slate-700">{log.pt_rpe ?? "—"}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-500 mb-1">Note PT</div>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {String(log.pt_notes || "").trim() || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}