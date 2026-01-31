"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { createClient } from "@supabase/supabase-js";
import { Info, Check, Plus, X, History, Trash2, Dumbbell, Edit2, Activity, FileText } from "lucide-react";

export default function LivePage({ params }) {
  const { id } = use(params);

  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [program, setProgram] = useState(null);
  const [clientName, setClientName] = useState("");
  const [coachName, setCoachName] = useState("");
  const [logs, setLogs] = useState({});
  const [historyLogs, setHistoryLogs] = useState({}); 
  const [loading, setLoading] = useState(true);

  const [activeWeek, setActiveWeek] = useState(1);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // POP-UP
  const [editingKey, setEditingKey] = useState(null);
  const [setLogsData, setSetLogsData] = useState([{ reps: "", weight: "" }]);
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeWeek]);

  const fetchData = async () => {
    setLoading(true);

    const { data: prog, error } = await supabase.from("programs").select("*").eq("id", id).single();
    if (error || !prog) { alert("Scheda non trovata"); setLoading(false); return; }
    setProgram(prog);
    
    // NOME COACH
    setCoachName(prog.coach_name || "Coach"); 

    // NOME ATLETA
    if (prog.client_id) {
      const { data: client } = await supabase.from("clients").select("full_name").eq("id", prog.client_id).single();
      if (client) setClientName(client.full_name); 
    }

    // LOGS SETTIMANA CORRENTE
    const { data: savedLogs } = await supabase.from("workout_logs")
      .select("*").eq("program_id", id).eq("week_number", activeWeek);

    const logsMap = {};
    if (savedLogs) {
      savedLogs.forEach((log) => {
        const key = `${log.exercise_name.trim()}_${log.day_label.trim()}`; 
        logsMap[key] = { ...log, notes: log.athlete_notes };
      });
    }
    setLogs(logsMap);

    // LOGS SETTIMANA PRECEDENTE
    if (activeWeek > 1) {
        const { data: prevLogs } = await supabase.from("workout_logs")
            .select("*").eq("program_id", id).eq("week_number", activeWeek - 1);
        
        const historyMap = {};
        if (prevLogs) {
            prevLogs.forEach((log) => {
                const key = `${log.exercise_name.trim()}_${log.day_label.trim()}`;
                historyMap[key] = log;
            });
        }
        setHistoryLogs(historyMap);
    } else {
        setHistoryLogs({});
    }

    setLoading(false);
  };

  // --- LOGICA OVERRIDE SETTIMANALE ROBUSTA ---
  const getExerciseDisplay = (ex) => {
      // 1. Se siamo in W1 o non c'è progressione, ritorna base
      if (activeWeek === 1 || !ex.progression) return ex;

      // 2. Cerca override (gestisce sia chiave numerica che stringa)
      const override = ex.progression[activeWeek] || ex.progression[String(activeWeek)];

      // 3. Se c'è override, uniscilo ai dati base. Altrimenti base.
      return override ? { ...ex, ...override } : ex;
  };

  const parseSetData = (repsString, weightString) => {
    if (!repsString) return [{ reps: "", weight: "" }];
    const r = String(repsString).split("-");
    const w = weightString ? String(weightString).split("-") : [];
    return r.map((rep, i) => ({ reps: rep, weight: w[i] || "" }));
  };

  const openEdit = (exName, dayName, existingData, targetReps) => {
    const key = `${exName.trim()}_${dayName.trim()}`;
    setEditingKey(key);
    setNoteInput(existingData?.notes || "");
    if (existingData) {
      setSetLogsData(parseSetData(existingData.actual_reps, existingData.actual_weight));
    } else {
      // Pre-popola placeholder ma lascia vuoto value
      setSetLogsData([{ reps: "", weight: "" }]);
    }
  };

  const closeEdit = () => { setEditingKey(null); setSetLogsData([{ reps: "", weight: "" }]); setNoteInput(""); };

  const updateRow = (index, field, value) => {
    setSetLogsData((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addSetRow = () => setSetLogsData((prev) => [...prev, { reps: "", weight: "" }]);
  const removeSetRow = (index) => setSetLogsData((prev) => prev.filter((_, i) => i !== index));

  const saveLog = async (exName, dayName) => {
    for (let i = 0; i < setLogsData.length; i++) {
      if (!setLogsData[i].reps) return alert(`Inserisci le reps per il set ${i + 1}`);
    }
    const key = `${exName.trim()}_${dayName.trim()}`;
    const repsString = setLogsData.map((r) => r.reps).join("-");
    const weightString = setLogsData.map((r) => r.weight).join("-");

    await supabase.from("workout_logs").delete().eq("program_id", id).eq("week_number", activeWeek).eq("day_label", dayName).eq("exercise_name", exName);

    const { error } = await supabase.from("workout_logs").insert([{
        program_id: id, exercise_name: exName, week_number: activeWeek, day_label: dayName,
        actual_sets: String(setLogsData.length), actual_reps: repsString, actual_weight: weightString,
        athlete_notes: noteInput, completed: true,
    }]);

    if (!error) {
      setLogs((prev) => ({ ...prev, [key]: { actual_reps: repsString, actual_weight: weightString, notes: noteInput, actual_sets: String(setLogsData.length), completed: true, exercise_name: exName, day_label: dayName }, }));
      closeEdit();
    } else { alert("Errore: " + error.message); }
  };

  const renderHistorySummary = (hist) => {
      if(!hist) return null;
      const r = String(hist.actual_reps).split('-')[0];
      const w = String(hist.actual_weight).split('-')[0];
      return `${w}kg x ${r} reps`;
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500">Caricamento...</div>;
  if (!program) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Errore</div>;

  const days = program.days_structure || [];
  const activeDay = days[activeDayIndex];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-32">
      <div className="bg-slate-800/90 backdrop-blur sticky top-0 z-20 border-b border-slate-700 shadow-xl pt-4">
        <div className="px-4 max-w-md mx-auto">
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Dumbbell size={10} /> {coachName}</div>
              <h1 className="text-2xl font-bold text-white leading-none capitalize">{program.title}</h1>
            </div>
            {clientName && (
              <div className="text-right">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">ATLETA</div>
                <div className="text-sm font-bold text-slate-200">{clientName}</div>
              </div>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            {Array.from({ length: program.duration || 4 }, (_, i) => i + 1).map((week) => (
              <button key={week} onClick={() => setActiveWeek(week)} className={`min-w-[45px] h-[45px] rounded-xl flex flex-col items-center justify-center border transition-all ${activeWeek === week ? "bg-blue-600 border-blue-500 text-white shadow-lg scale-105" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                <span className="text-[9px] font-bold opacity-60 leading-none">W</span><span className="text-lg font-bold leading-none">{week}</span>
              </button>
            ))}
          </div>

          <div className="flex border-b border-slate-700 overflow-x-auto no-scrollbar">
            {days.map((day, idx) => (
              <button key={idx} onClick={() => setActiveDayIndex(idx)} className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeDayIndex === idx ? "border-blue-500 text-white" : "border-transparent text-slate-500"}`}>{day.name}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {program.notes && <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl text-sm text-blue-100 flex gap-2"><Info size={16} className="shrink-0 mt-0.5" /><div><span className="font-bold text-blue-400 uppercase text-[10px] block">Obiettivo:</span>{program.notes}</div></div>}
        {activeDay?.notes && <div className="bg-amber-900/20 border border-amber-800/50 p-3 rounded-xl text-sm text-amber-100 flex gap-2"><FileText size={16} className="shrink-0 mt-0.5 text-amber-500" /><div><span className="font-bold text-amber-500 uppercase text-[10px] block">Note del Giorno:</span>{activeDay.notes}</div></div>}

        {(!activeDay || !activeDay.exercises || activeDay.exercises.length === 0) ? (
            <div className="text-center py-10 text-slate-500">Nessun esercizio.</div>
        ) : (
            activeDay.exercises.map((rawEx, index) => {
                // --- APPLICAZIONE OVERRIDE SETTIMANALE ---
                const ex = getExerciseDisplay(rawEx); 
                
                const key = `${ex.name.trim()}_${activeDay.name.trim()}`;
                const logData = logs[key];
                const historyData = historyLogs[key];
                const isDone = !!logData;
                const isEditing = editingKey === key;

                // Controlla se i dati mostrati sono modificati per questa settimana
                const isModified = rawEx.progression && (rawEx.progression[activeWeek] || rawEx.progression[String(activeWeek)]);

                return (
                    <div key={index} className={`rounded-2xl border transition-all overflow-hidden relative ${isDone ? "bg-slate-900/50 border-green-900 shadow-sm" : "bg-slate-800 border-slate-700"}`}>
                        
                        {isEditing ? (
                            <div className="p-4 bg-slate-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white capitalize">{ex.name}</h3>
                                    <button onClick={closeEdit} className="p-2 bg-slate-700 rounded-full text-slate-400 hover:text-white"><X size={20}/></button>
                                </div>
                                {historyData && (
                                    <div className="mb-4 bg-slate-700/50 p-3 rounded-xl border border-slate-600/50 flex justify-between items-center">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><History size={12}/> LAST SESSION (W{activeWeek-1})</div>
                                        <div className="text-sm font-bold text-white bg-slate-600 px-2 py-1 rounded">{renderHistorySummary(historyData)}</div>
                                    </div>
                                )}
                                <div className="flex text-[10px] uppercase font-bold text-slate-500 mb-2 px-1">
                                    <span className="flex-1 text-center">Reps</span><span className="flex-1 text-center">Kg</span><span className="w-8"></span>
                                </div>
                                <div className="space-y-2 mb-4">
                                    {setLogsData.map((row, i) => (
                                        <div key={i} className="flex gap-2 items-center justify-center">
                                            <input type="text" inputMode="decimal" placeholder={ex.reps} value={row.reps} onChange={(e) => updateRow(i, "reps", e.target.value)} className="w-24 h-10 bg-slate-950 border border-slate-700 rounded-lg text-center text-white font-bold text-lg outline-none focus:border-blue-500"/>
                                            <input type="text" inputMode="decimal" placeholder={ex.load || "-"} value={row.weight} onChange={(e) => updateRow(i, "weight", e.target.value)} className="w-28 h-10 bg-slate-950 border border-slate-700 rounded-lg text-center text-yellow-400 font-bold text-lg outline-none focus:border-blue-500"/>
                                            <button onClick={() => removeSetRow(i)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-700 text-slate-300"><X size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mb-4"><button onClick={addSetRow} className="flex-1 py-2 border border-dashed border-slate-600 rounded text-slate-400 text-xs font-bold hover:bg-slate-700"><Plus size={14}/> AGGIUNGI SERIE</button></div>
                                <textarea placeholder="Note allenamento..." value={noteInput} onChange={(e) => setNoteInput(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white outline-none focus:border-blue-500 resize-none mb-4" rows={2}/>
                                <button onClick={() => saveLog(ex.name, activeDay.name)} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"><Check size={20}/> SALVA</button>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <div className="p-5 border-b border-slate-700/50 bg-slate-800/40">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className={`text-xl font-bold capitalize mb-1 ${isDone ? "text-green-500" : "text-white"}`}>{ex.name}</h3>
                                            {/* Badge se è una modifica specifica per la settimana */}
                                            {isModified && activeWeek > 1 && (
                                                <span className="text-[9px] font-bold text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded border border-blue-800/50">W{activeWeek} UPDATE</span>
                                            )}
                                        </div>
                                        {historyData && !isDone && (
                                            <div className="bg-slate-900 px-2 py-1 rounded border border-slate-600 text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                                <History size={10}/> Last: {renderHistorySummary(historyData)}
                                            </div>
                                        )}
                                    </div>
                                    {ex.notes && <div className="text-xs text-slate-400 flex items-center gap-1 mt-1 bg-slate-700/50 p-1.5 rounded-lg inline-block"><Info size={12}/> {ex.notes}</div>}
                                </div>

                                <div className="grid grid-cols-4 divide-x divide-slate-700/50 bg-slate-800/20 border-b border-slate-700/50">
                                    <div className="p-3 text-center"><span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Serie</span><div className="text-white font-bold text-sm">{ex.sets} x {ex.reps}</div></div>
                                    <div className="p-3 text-center"><span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Carico</span><div className="text-yellow-400 font-bold text-sm">{ex.load || "-"}</div></div>
                                    <div className="p-3 text-center"><span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Recupero</span><div className="text-blue-400 font-bold text-sm">{ex.rest || "-"}</div></div>
                                    <div className="p-3 text-center"><span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Stato</span><div className={isDone ? "text-green-500 font-bold text-sm" : "text-slate-500 text-sm"}>{isDone ? "Fatto" : "Da fare"}</div></div>
                                </div>

                                {isDone && (
                                    <div className="bg-slate-900/30 p-4">
                                        <div className="space-y-1 mb-3">
                                            {String(logData.actual_reps).split('-').map((r, i) => {
                                                const w = String(logData.actual_weight).split('-')[i] || '-';
                                                return (
                                                    <div key={i} className="grid grid-cols-[40px_1fr_1fr] text-sm font-mono items-center text-center">
                                                        <span className="text-green-500/70 font-bold text-left">#{i+1}</span>
                                                        <span className="font-bold text-white">{r} reps</span>
                                                        <span className="text-green-400 font-bold">{w} kg</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {logData.notes && <div className="text-xs text-green-200/50 italic border-t border-green-900/20 pt-2">"{logData.notes}"</div>}
                                    </div>
                                )}

                                <div className="p-3">
                                    <button onClick={() => openEdit(ex.name, activeDay.name, logData, ex.reps)} className={`w-full py-3 rounded-xl flex items-center justify-center font-bold text-sm transition-all gap-2 border ${isDone ? "bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800" : "bg-blue-600 border-blue-600 text-white"}`}>
                                        {isDone ? <><Edit2 size={16}/> MODIFICA</> : <><Activity size={16}/> INSERISCI DATI</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })
        )}
        <div className="h-20"></div>
      </div>
    </div>
  );
}