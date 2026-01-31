"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { createClient } from "@supabase/supabase-js";
import { Info, Check, Plus, X, History, Trash2, Dumbbell, User, Edit2, Activity } from "lucide-react";

export default function LivePage({ params }) {
  const { id } = use(params);

  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";

  const supabase = createClient(supabaseUrl, supabaseKey);

  const [program, setProgram] = useState(null);
  const [clientName, setClientName] = useState("");
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

    if (prog) {
      setProgram(prog);

      if (prog.client_id) {
        const { data: client } = await supabase
          .from("clients")
          .select("*")
          .eq("id", prog.client_id)
          .single();

        if (client) setClientName(client.full_name || client.name || "");
      }
    }

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

      const { data: savedLogs } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("program_id", id)
        .eq("week_number", activeWeek);

      const logsMap = {};
      if (savedLogs) {
        savedLogs.forEach((log) => {
          const key = `${log.exercise_name}_${log.day_label}`;
          logsMap[key] = { ...log, notes: log.athlete_notes };
        });
      }
      setLogs(logsMap);

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
    setNoteInput(existingData?.notes || "");

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

  const updateRow = (index, field, value) => {
    setSetLogsData((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addSetRow = () => {
    setSetLogsData((prev) => [...prev, { reps: "", weight: "" }]);
  };

  const removeSetRow = (index) => {
    setSetLogsData((prev) => prev.filter((_, i) => i !== index));
  };

  const saveLog = async (ex) => {
    for (let i = 0; i < setLogsData.length; i++) {
      const row = setLogsData[i];
      if (!row.reps || !row.weight) {
        alert(`Errore Set ${i + 1}: Inserisci tutti i valori.`);
        return;
      }
    }

    const key = `${ex.name}_${activeDay}`;
    const repsString = setLogsData.map((r) => r.reps).join("-");
    const weightString = setLogsData.map((r) => r.weight).join("-");

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
          notes: noteInput,
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

  const formatHistory = (history) => {
    const reps = String(history.actual_reps || "").split("-");
    const weight = String(history.actual_weight || "").split("-");
    if (reps.length === 1) return `${reps[0]} reps @ ${weight[0]} kg`;
    return `${reps.join("-")} reps @ ${weight.join("-")} kg`;
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
          <div className="flex justify-between items-end mb-4">
            <div>
              {/* NOME COACH */}
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <Dumbbell size={10} /> {program?.coach_name || "COACH"}
              </div>
              <h1 className="text-2xl font-bold text-white leading-none capitalize">{program?.title}</h1>
            </div>

            {/* NOME ATLETA (Icona rimossa) */}
            {clientName && (
              <div className="text-right">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                  ATLETA
                </div>
                <div className="text-sm font-bold text-slate-200 flex items-center gap-1 justify-end">
                  {clientName}
                </div>
              </div>
            )}
          </div>

          {/* SELETTORE SETTIMANE */}
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            {Array.from({ length: program?.duration || 1 }, (_, i) => i + 1).map((week) => (
              <button
                key={week}
                onClick={() => setActiveWeek(week)}
                className={`min-w-[45px] h-[45px] rounded-xl flex flex-col items-center justify-center border transition-all ${
                  activeWeek === week
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40 scale-105"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                }`}
              >
                <span className="text-[9px] font-bold opacity-60 leading-none">W</span>
                <span className="text-lg font-bold leading-none">{week}</span>
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
                isDone ? "bg-slate-900/50 border-green-800/50 shadow-lg shadow-green-900/10" : "bg-slate-800 border-slate-700"
              }`}
            >
              {isEditing ? (
                <div className="p-4 bg-slate-800 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white capitalize">{ex.name}</h3>
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

                  <div className="flex text-[10px] uppercase font-bold text-slate-500 mb-2 px-1">
                    <span className="flex-1 text-center">Reps</span>
                    <span className="flex-1 text-center">Kg</span>
                    <span className="w-8"></span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {setLogsData.map((row, i) => (
                      <div key={i} className="flex gap-2 items-center justify-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder={weekData.reps}
                          value={row.reps}
                          onChange={(e) => updateRow(i, "reps", e.target.value)}
                          className="w-24 h-10 bg-slate-950 border border-slate-700 rounded-lg text-center text-white font-bold text-lg outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                        />

                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder={weekData.weight || "-"}
                          value={row.weight}
                          onChange={(e) => updateRow(i, "weight", e.target.value)}
                          className="w-28 h-10 bg-slate-950 border border-slate-700 rounded-lg text-center text-yellow-400 font-bold text-lg outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                        />

                        <button
                          onClick={() => removeSetRow(i)}
                          className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-700 text-slate-300 hover:bg-red-900/40 hover:text-red-300 transition"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

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
                        <Trash2 size={14} /> ELIMINA
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
                <div className="flex flex-col">
                  {/* HEADER CARD */}
                  <div className="p-5 border-b border-slate-700/50 bg-slate-800/40">
                    <h3
                      className={`text-xl font-bold capitalize mb-1 ${
                        isDone ? "text-green-500" : "text-white"
                      }`}
                    >
                      {ex.name}
                    </h3>
                    {weekData.note && (
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Info size={12} /> {weekData.note}
                      </div>
                    )}
                  </div>

                  {/* TARGET GRID */}
                  <div className="grid grid-cols-4 divide-x divide-slate-700/50 bg-slate-800/20 border-b border-slate-700/50">
                    <div className="p-3 text-center">
                      <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                        Serie
                      </span>
                      <div className="text-white font-bold text-sm">
                        {weekData.sets} <span className="text-slate-500">x</span> {weekData.reps}
                      </div>
                    </div>

                    <div className="p-3 text-center">
                      <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                        Carico
                      </span>
                      <div className="text-yellow-400 font-bold text-sm">
                        {weekData.weight ? `${weekData.weight}` : "-"}
                        <span className="text-[10px] text-yellow-600 ml-0.5">Kg</span>
                      </div>
                    </div>

                    <div className="p-3 text-center">
                      <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                        RPE
                      </span>
                      <div className="text-orange-400 font-bold text-sm">
                        {weekData.rpe || "-"}
                      </div>
                    </div>

                    <div className="p-3 text-center">
                      <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                        Recupero
                      </span>
                      <div className="text-blue-400 font-bold text-sm">
                        {weekData.rest || "-"}
                      </div>
                    </div>
                  </div>

                  {/* SEZIONE "SET ESEGUITI" */}
                  {isDone && (
                    <div className="bg-slate-900/30 p-4">
                      <div className="grid grid-cols-[48px_80px_80px] justify-center text-[10px] uppercase font-bold text-green-600/80 mb-2 border-b border-green-900/20 pb-1">
                         <span className="text-left">Set</span>
                         <span className="text-center">Reps</span>
                         <span className="text-center">Kg</span>
                      </div>

                      <div className="space-y-1 mb-3">
                        {savedReps.map((r, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[48px_80px_80px] justify-center text-sm font-mono items-center"
                          >
                            <span className="text-green-500/70 font-bold text-left">#{i + 1}</span>
                            <span className="text-center font-bold text-white">{r}</span>
                            <span className="text-center text-green-400 font-bold">{savedWeight[i] || "-"}</span>
                          </div>
                        ))}
                      </div>
                      
                      {logData?.notes && (
                        <div className="text-xs text-green-200/50 italic border-t border-green-900/20 pt-2 mt-2">
                          "{logData.notes}"
                        </div>
                      )}
                    </div>
                  )}

                  {/* STORICO SETTIMANA SCORSA */}
                  {history && !isDone && (
                    <div className="bg-slate-900/35 p-4 border-t border-slate-800/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 font-bold flex items-center gap-2 uppercase text-[10px]">
                                <History size={12} /> Settimana Scorsa
                            </span>
                        </div>

                        <div className="grid grid-cols-[48px_80px_80px] justify-center text-[10px] uppercase font-bold text-slate-500/80 mb-2 border-b border-slate-700/40 pb-1">
                            <span className="text-left">Set</span>
                            <span className="text-center">Reps</span>
                            <span className="text-center">Kg</span>
                        </div>

                        {(() => {
                            const repsArr = String(history.actual_reps || "").split("-");
                            const wArr = String(history.actual_weight || "").split("-");
                            return (
                                <div className="space-y-1">
                                    {repsArr.map((r, i) => (
                                        <div key={i} className="grid grid-cols-[48px_80px_80px] justify-center text-sm font-mono items-center">
                                            <span className="text-slate-600 font-bold text-left">#{i + 1}</span>
                                            <span className="text-center font-bold text-slate-300">{r}</span>
                                            <span className="text-center text-slate-400 font-bold">{wArr[i] || "-"}</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                        
                        {history.athlete_notes && (
                            <div className="text-xs text-slate-500 italic border-t border-slate-700/40 pt-2 mt-3">
                                "{history.athlete_notes}"
                            </div>
                        )}
                    </div>
                  )}

                  <div className="p-3">
                    <button
                      onClick={() => openEdit(ex.name, logData)}
                      className={`w-full py-3 rounded-xl flex items-center justify-center font-bold text-sm transition-all active:scale-95 gap-2 shadow-lg border ${
                        isDone
                          ? "bg-transparent border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white"
                          : "bg-blue-600 border-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20"
                      }`}
                    >
                      {isDone ? (
                        <>
                          <Edit2 size={16} /> MODIFICA DATI
                        </>
                      ) : (
                        <>
                          <Activity size={16} /> INSERISCI DATI
                        </>
                      )}
                    </button>
                  </div>
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