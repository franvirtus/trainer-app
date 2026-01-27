"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { createClient } from "@supabase/supabase-js";
import { Info, Check, Plus, X, History, Trash2 } from "lucide-react";

export default function LivePage({ params }) {
  const { id } = use(params);

  // ⚠️ Sposta in env NEXT_PUBLIC_* quando puoi
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState({});
  const [historyLogs, setHistoryLogs] = useState({});
  const [loading, setLoading] = useState(true);

  const [activeWeek, setActiveWeek] = useState(1);
  const [activeDay, setActiveDay] = useState("");
  const [availableDays, setAvailableDays] = useState([]);

  // POP-UP
  const [editingId, setEditingId] = useState(null);
  const [setLogsData, setSetLogsData] = useState([{ reps: "", weight: "" }]);
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeWeek]);

  const fetchData = async () => {
    setLoading(true);

    const { data: prog } = await supabase
      .from("programs")
      .select("*")
      .eq("id", id)
      .single();

    if (prog) setProgram(prog);

    const { data: ex } = await supabase
      .from("exercises")
      .select("*")
      .eq("program_id", id)
      .order("created_at", { ascending: true });

    if (ex && ex.length > 0) {
      setExercises(ex);

      const uniqueDays = [...new Set(ex.map((item) => item.day || "Giorno A"))].sort();
      setAvailableDays(uniqueDays);

      if (!activeDay) setActiveDay(uniqueDays[0]);

      // LOG ATTUALI
      const { data: savedLogs } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("program_id", id)
        .eq("week_number", activeWeek);

      const logsMap = {};
      if (savedLogs) {
        savedLogs.forEach((log) => {
          const key = `${log.exercise_name}_${log.day_label}`;
          logsMap[key] = log;
        });
      }
      setLogs(logsMap);

      // STORICO (settimana precedente)
      if (activeWeek > 1) {
        const { data: history } = await supabase
          .from("workout_logs")
          .select("*")
          .eq("program_id", id)
          .eq("week_number", activeWeek - 1);

        const hMap = {};
        if (history) {
          history.forEach((h) => {
            const key = `${h.exercise_name}_${h.day_label}`;
            hMap[key] = h;
          });
        }
        setHistoryLogs(hMap);
      } else {
        setHistoryLogs({});
      }
    }

    setLoading(false);
  };

  const parseSetData = (repsString, weightString) => {
    if (!repsString) return [{ reps: "", weight: "" }];
    const r = String(repsString).split("-");
    const w = weightString ? String(weightString).split("-") : [];
    return r.map((rep, i) => ({ reps: rep, weight: w[i] || "" }));
  };

  const openEdit = (exName, existingData) => {
    const key = `${exName}_${activeDay}`;
    setEditingId(key);
    setNoteInput(existingData?.athlete_notes || "");

    if (existingData) {
      setSetLogsData(parseSetData(existingData.actual_reps, existingData.actual_weight));
    } else {
      setSetLogsData([{ reps: "", weight: "" }]);
    }
  };

  const closeEdit = () => {
    setEditingId(null);
    setSetLogsData([{ reps: "", weight: "" }]);
    setNoteInput("");
  };

  // ✅ update funzionale (evita bug)
  const updateRow = (index, field, value) => {
    setSetLogsData((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // ✅ add funzionale
  const addSetRow = () => {
    setSetLogsData((prev) => [...prev, { reps: "", weight: "" }]);
  };

  // ✅ elimina DAVVERO la serie anche se è l’unica.
  // Se rimani a 0 righe, ricrea 1 riga vuota per non rompere la UI.
  const removeSetRow = (index) => {
    setSetLogsData((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [{ reps: "", weight: "" }] : next;
    });
  };

  const saveLog = async (ex) => {
    // VALIDAZIONE: Blocca se 0 o vuoto
    for (let i = 0; i < setLogsData.length; i++) {
      const row = setLogsData[i];
      const r = parseFloat(row.reps);
      const w = parseFloat(row.weight);
      if (!row.reps || Number.isNaN(r) || r <= 0 || !row.weight || Number.isNaN(w) || w <= 0) {
        alert(`Errore Set ${i + 1}: Inserisci valori validi (>0).`);
        return;
      }
    }

    const key = `${ex.name}_${activeDay}`;
    const repsString = setLogsData.map((r) => r.reps).join("-");
    const weightString = setLogsData.map((r) => r.weight).join("-");

    // Delete + Insert (semplice e robusto)
    await supabase
      .from("workout_logs")
      .delete()
      .eq("program_id", id)
      .eq("week_number", activeWeek)
      .eq("day_label", activeDay)
      .eq("exercise_name", ex.name);

    const { error } = await supabase.from("workout_logs").insert([
      {
        program_id: id,
        exercise_name: ex.name,
        week_number: activeWeek,
        day_label: activeDay,
        actual_sets: String(setLogsData.length),
        actual_reps: repsString,
        actual_weight: weightString,
        athlete_notes: noteInput,
        completed: true,
      },
    ]);

    if (!error) {
      setLogs((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          actual_reps: repsString,
          actual_weight: weightString,
          athlete_notes: noteInput,
          actual_sets: String(setLogsData.length),
          completed: true,
          exercise_name: ex.name,
          day_label: activeDay,
          week_number: activeWeek,
          program_id: id,
        },
      }));
      closeEdit();
    } else {
      alert("Errore: " + error.message);
    }
  };

  // ✅ elimina log salvato (tutto esercizio del giorno)
  const deleteLog = async (ex) => {
    const key = `${ex.name}_${activeDay}`;

    const { error } = await supabase
      .from("workout_logs")
      .delete()
      .eq("program_id", id)
      .eq("week_number", activeWeek)
      .eq("day_label", activeDay)
      .eq("exercise_name", ex.name);

    if (error) {
      alert("Errore eliminazione: " + error.message);
      return;
    }

    setLogs((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });

    closeEdit();
  };

  const currentExercises = exercises.filter((ex) => (ex.day || "Giorno A") === activeDay);

  if (loading)
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500">
        Caricamento...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-32">
      {/* HEADER */}
      <div className="bg-slate-800/90 backdrop-blur sticky top-0 z-20 border-b border-slate-700 shadow-xl pt-4">
        <div className="px-4 max-w-md mx-auto">
          <h1 className="text-xl font-bold text-white mb-2">{program?.title || ""}</h1>

          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            {Array.from({ length: program?.duration || 1 }, (_, i) => i + 1).map((week) => (
              <button
                key={week}
                onClick={() => setActiveWeek(week)}
                className={`min-w-[40px] h-[40px] rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  activeWeek === week ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400"
                }`}
              >
                {week}
              </button>
            ))}
          </div>

          <div className="flex border-b border-slate-700">
            {availableDays.map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeDay === day ? "border-blue-500 text-white" : "border-transparent text-slate-500"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {program?.notes && (
          <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl text-sm text-blue-100 flex gap-2">
            <Info size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-400 uppercase text-[10px] block">
                Obiettivo Mesociclo:
              </span>
              {program.notes}
            </div>
          </div>
        )}

        {currentExercises.map((ex, index) => {
          const weekData = ex.progression?.[activeWeek] || {};
          const key = `${ex.name}_${activeDay}`;
          const logData = logs[key];
          const isDone = !!logData;
          const history = historyLogs[key];
          const isEditing = editingId === key;

          const savedReps = isDone ? String(logData.actual_reps || "").split("-") : [];
          const savedWeight = isDone ? String(logData.actual_weight || "").split("-") : [];

          return (
            <div
              key={index}
              className={`rounded-2xl border transition-all overflow-hidden relative ${
                isDone ? "bg-green-900/10 border-green-800/30" : "bg-slate-800 border-slate-700"
              }`}
            >
              {/* --- POP-UP EDITING --- */}
              {isEditing ? (
                <div className="p-4 bg-slate-800 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{ex.name}</h3>
                      <p className="text-xs text-slate-400">
                        Target: {weekData.sets} x {weekData.reps}
                      </p>
                    </div>

                    <button
                      onClick={closeEdit}
                      className="p-2 bg-slate-700 rounded-full text-slate-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* INTESTAZIONE */}
                  <div className="flex text-[10px] uppercase font-bold text-slate-500 mb-2 px-1">
                    <span className="flex-1 text-center">Reps</span>
                    <span className="flex-1 text-center">Kg</span>
                    <span className="w-8"></span>
                  </div>

                  {/* RIGHE SERIE: SENZA NUMERI + X a destra */}
                  <div className="space-y-2 mb-4">
                    {setLogsData.map((row, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="number"
                          placeholder={weekData.reps}
                          value={row.reps}
                          onChange={(e) => updateRow(i, "reps", e.target.value)}
                          className="flex-1 h-7 bg-slate-900 border border-slate-600 rounded text-center text-white font-bold text-xs outline-none focus:border-blue-500 transition-all placeholder:text-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />

                        <input
                          type="number"
                          placeholder={weekData.weight || "-"}
                          value={row.weight}
                          onChange={(e) => updateRow(i, "weight", e.target.value)}
                          className="flex-1 h-7 bg-slate-900 border border-slate-600 rounded text-center text-white font-bold text-xs outline-none focus:border-blue-500 transition-all placeholder:text-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />

                        <button
                          onClick={() => removeSetRow(i)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-slate-700 text-slate-300 hover:bg-red-900/40 hover:text-red-300 transition"
                          title="Elimina serie"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* BOTTONI AZIONE */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={addSetRow}
                      className="flex-1 py-2 border border-dashed border-slate-600 rounded text-slate-400 text-xs font-bold hover:bg-slate-700 hover:text-white transition flex items-center justify-center gap-1"
                    >
                      <Plus size={14} /> AGGIUNGI SERIE
                    </button>

                    {logs[`${ex.name}_${activeDay}`] && (
                      <button
                        onClick={() => deleteLog(ex)}
                        className="py-2 px-3 rounded border border-red-700/50 text-red-300 text-xs font-bold hover:bg-red-900/20 transition flex items-center justify-center gap-1"
                      >
                        <Trash2 size={14} /> ELIMINA LOG
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                      Le tue note:
                    </label>
                    <textarea
                      placeholder="Sensazioni..."
                      value={noteInput}
                      rows={2}
                      onChange={(e) => setNoteInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white outline-none focus:border-blue-500 resize-none mb-4 placeholder:text-slate-600"
                    />
                  </div>

                  <button
                    onClick={() => saveLog(ex)}
                    className="w-full bg-green-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg hover:bg-green-500 transition-all active:scale-95"
                  >
                    <Check size={20} /> SALVA
                  </button>
                </div>
              ) : (
                // --- CARD CHIUSA ---
                <div className="p-5 flex flex-col items-center text-center">
                  <h3 className={`text-xl font-bold mb-2 ${isDone ? "text-green-400" : "text-white"}`}>
                    {ex.name}
                  </h3>

                  <div className="flex flex-wrap justify-center gap-2 text-xs font-bold mb-3">
                    <span className="bg-slate-950 px-3 py-1.5 rounded text-slate-300 border border-slate-800">
                      {weekData.sets} x {weekData.reps}
                    </span>
                    {weekData.weight && (
                      <span className="text-yellow-500 bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                        {weekData.weight} Kg
                      </span>
                    )}
                    {weekData.rpe && (
                      <span className="text-orange-400 bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                        RPE {weekData.rpe}
                      </span>
                    )}
                    {weekData.rest && (
                      <span className="text-blue-400 bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                        {weekData.rest}
                      </span>
                    )}
                  </div>

                  {weekData.note && (
                    <div className="w-full bg-slate-900/50 p-3 rounded-lg border border-slate-800 mb-4 text-left">
                      <span className="text-[10px] font-bold text-blue-400 uppercase block mb-1">
                        Nota PT:
                      </span>
                      <div className="text-sm text-slate-300 italic">"{weekData.note}"</div>
                    </div>
                  )}

                  {isDone && (
                    <div className="w-full bg-slate-900/50 rounded-xl p-3 border border-slate-800 mb-3 animate-in fade-in">
                      <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-2 border-b border-slate-700 pb-1">
                        <span>Set</span>
                        <span>Reps</span>
                        <span>Kg</span>
                      </div>

                      <div className="space-y-1">
                        {savedReps.map((r, i) => (
                          <div key={i} className="flex justify-between text-sm font-mono items-center">
                            <span className="text-slate-600 w-4 font-bold">{i + 1}</span>
                            <span className="font-bold text-white">{r}</span>
                            <span className="text-blue-400 font-bold">{savedWeight[i] || "-"}</span>
                          </div>
                        ))}
                      </div>

                      {logData?.athlete_notes && (
                        <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-400 text-left">
                          <span className="text-[9px] uppercase font-bold text-slate-500">
                            Tua Nota:
                          </span>{" "}
                          {logData.athlete_notes}
                        </div>
                      )}
                    </div>
                  )}

                  {history && !isDone && (
                    <div className="w-full bg-slate-900/30 p-2 rounded border border-slate-800/50 mb-3">
                      <div className="text-[10px] text-slate-500 uppercase font-bold flex justify-center items-center gap-1 mb-1">
                        <History size={10} /> Settimana Scorsa
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {String(history.actual_reps || "").split("-")[0]} reps @{" "}
                        {String(history.actual_weight || "").split("-")[0]} kg ...
                      </div>
                    </div>
                  )}

                  {/* Sempre + */}
                  <button
                    onClick={() => openEdit(ex.name, logData)}
                    className={`w-full py-3 rounded-xl flex items-center justify-center font-bold text-sm transition-all active:scale-95 gap-2 mt-auto shadow-lg ${
                      isDone
                        ? "bg-slate-700 border border-slate-600 text-white hover:bg-slate-600"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                    }`}
                  >
                    <Plus size={20} /> SALVA PESI/REP
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <div className="h-20"></div>
      </div>
    </div>
  );
}
