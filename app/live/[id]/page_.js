"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, use } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Info,
  Check,
  Plus,
  X,
  History,
  Edit2,
  Activity,
  AlertTriangle,
  Coffee,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Trophy
} from "lucide-react";

export default function LivePage({ params }) {
  const { id } = use(params);

  // --- CONFIGURAZIONE ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = useMemo(() => createClient(supabaseUrl, supabaseKey), [supabaseUrl, supabaseKey]);

  const [program, setProgram] = useState(null);
  const [clientName, setClientName] = useState("");
  const [logs, setLogs] = useState({});
  const [historyLogs, setHistoryLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [activeWeek, setActiveWeek] = useState(1);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  
  // STATO NAVIGAZIONE
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);

  // EDITING
  const [editingKey, setEditingKey] = useState(null);
  const [setLogsData, setSetLogsData] = useState([{ reps: "", weight: "" }]);
  const [noteInput, setNoteInput] = useState("");

  // UX
  const [confirmFlash, setConfirmFlash] = useState(false);

  useEffect(() => {
    if (id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeWeek]);

  // Reset al cambio giorno
  useEffect(() => {
    setActiveExerciseIndex(0);
    setReviewMode(false);
    closeEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeek, activeDayIndex]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data: prog, error } = await supabase
      .from("programs")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !prog) {
      setErrorMsg("Scheda non trovata.");
      setLoading(false);
      return;
    }

    if (!prog.days_structure || !Array.isArray(prog.days_structure)) {
      prog.days_structure = [];
    }

    setProgram(prog);

    if (prog.client_id) {
      const { data: client } = await supabase.from("clients").select("full_name").eq("id", prog.client_id).single();
      if (client) setClientName(client.full_name);
    }

    // Logs Settimana Corrente
    const { data: savedLogs } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("program_id", id)
      .eq("week_number", activeWeek);

    const logsMap = {};
    if (savedLogs) {
      savedLogs.forEach((log) => {
        const key = makeKey(log.exercise_name, log.day_label);
        logsMap[key] = { ...log, notes: log.athlete_notes };
      });
    }
    setLogs(logsMap);

    // History Settimana Precedente
    if (activeWeek > 1) {
      const { data: prevLogs } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("program_id", id)
        .eq("week_number", activeWeek - 1);

      const historyMap = {};
      if (prevLogs) {
        prevLogs.forEach((log) => {
          const key = makeKey(log.exercise_name, log.day_label);
          historyMap[key] = log;
        });
      }
      setHistoryLogs(historyMap);
    } else {
      setHistoryLogs({});
    }

    setLoading(false);
  };

  // --- HELPERS ---
  const getExerciseDisplay = (ex) => {
    if (!ex) return null;
    if (activeWeek === 1 || !ex?.progression) return ex;
    const override = ex.progression[activeWeek] || ex.progression[String(activeWeek)];
    return override ? { ...ex, ...override } : ex;
  };

  const getDayNotesDisplay = (day) => {
    if (!day) return "";
    if (activeWeek === 1) return day.notes;
    const override = day.progression?.[activeWeek] || day.progression?.[String(activeWeek)];
    return override?.notes ?? day.notes;
  };

  const makeKey = (exName, dayName) => `${String(exName || "").trim()}_${String(dayName || "").trim()}`;

  const parseSetData = (repsString, weightString) => {
    const r = String(repsString || "").split("-");
    const w = String(weightString || "").split("-");
    const maxLen = Math.max(r.length, w.length, 1);
    // Filtra stringhe vuote se necessario, ma qui inizializziamo
    if (!repsString && !weightString) return [{ reps: "", weight: "" }];
    
    return Array.from({ length: maxLen }, (_, i) => ({
      reps: r[i] || "",
      weight: w[i] || "",
    }));
  };

  const renderHistorySummary = (hist) => {
    if (!hist) return null;
    const r = String(hist.actual_reps).split("-")[0];
    const w = String(hist.actual_weight).split("-")[0];
    return `${w}kg x ${r}`;
  };

  // --- EDITING ---
  const openEdit = (exName, dayName, existingData) => {
    const key = makeKey(exName, dayName);
    setEditingKey(key);
    setNoteInput(existingData?.notes || "");
    if (existingData) {
      setSetLogsData(parseSetData(existingData.actual_reps, existingData.actual_weight));
    } else {
      setSetLogsData([{ reps: "", weight: "" }]);
    }
  };

  const closeEdit = () => {
    setEditingKey(null);
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

  const addSetRow = () => setSetLogsData((prev) => [...prev, { reps: "", weight: "" }]);
  const removeSetRow = (index) => {
    setSetLogsData((prev) => {
        if (prev.length <= 1) return [{ reps: "", weight: "" }];
        return prev.filter((_, i) => i !== index);
    });
  };

  // --- NAVIGAZIONE ---
  const goNext = (total) => {
    if (activeExerciseIndex < total - 1) {
        setActiveExerciseIndex(prev => prev + 1);
        closeEdit();
    }
  };
  const goPrev = () => {
    if (activeExerciseIndex > 0) {
        setActiveExerciseIndex(prev => prev - 1);
        closeEdit();
    }
  };

  // --- SALVATAGGIO ---
  const saveLog = async (exName, dayName, totalExercises) => {
    const key = makeKey(exName, dayName);
    
    // Pulisci dati
    const normalized = setLogsData.map(s => ({
        reps: String(s.reps || "").trim(),
        weight: String(s.weight || "").trim()
    })).filter(s => s.reps !== "" || s.weight !== "");

    const finalSets = normalized.length > 0 ? normalized : [{ reps: "", weight: "" }];
    
    const repsString = finalSets.map(s => s.reps).join("-");
    const weightString = finalSets.map(s => s.weight).join("-");

    // Cancella vecchio
    await supabase.from("workout_logs").delete()
        .eq("program_id", id).eq("week_number", activeWeek)
        .eq("day_label", dayName).eq("exercise_name", exName);

    // Inserisci nuovo (COMPLETED = TRUE)
    const { error } = await supabase.from("workout_logs").insert([{
        program_id: id,
        exercise_name: exName,
        week_number: activeWeek,
        day_label: dayName,
        actual_sets: String(finalSets.length),
        actual_reps: repsString,
        actual_weight: weightString,
        athlete_notes: noteInput,
        completed: true
    }]);

    if (error) {
        alert("Errore: " + error.message);
    } else {
        // Aggiorna stato locale
        setLogs(prev => ({
            ...prev,
            [key]: {
                actual_reps: repsString,
                actual_weight: weightString,
                notes: noteInput,
                actual_sets: String(finalSets.length),
                completed: true
            }
        }));
        setConfirmFlash(true);
        setTimeout(() => setConfirmFlash(false), 500);
        closeEdit();
    }
  };

  // --- RENDER ---
  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Caricamento...</div>;
  if (errorMsg) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4 p-6"><AlertTriangle size={40} className="text-red-500"/><p>{errorMsg}</p><button onClick={()=>window.history.back()} className="bg-slate-800 px-4 py-2 rounded">Indietro</button></div>;

  const days = program?.days_structure || [];
  const activeDay = days[activeDayIndex];
  const activeDayNotes = getDayNotesDisplay(activeDay);
  
  const exercises = activeDay?.exercises || [];
  const totalExercises = exercises.length;
  
  // Esercizio Corrente
  const rawEx = totalExercises > 0 ? exercises[activeExerciseIndex] : null;
  const ex = getExerciseDisplay(rawEx);
  
  const key = ex ? makeKey(ex.name, activeDay?.name) : null;
  const currentLog = key ? logs[key] : null;
  const currentHistory = key ? historyLogs[key] : null;
  
  const isDone = !!currentLog?.completed;
  const isEditing = editingKey === key;

  // Calcolo progresso giorno
  const completedCount = exercises.filter(e => logs[makeKey(e.name, activeDay?.name)]?.completed).length;
  const isDayFinished = totalExercises > 0 && completedCount === totalExercises;
  const showSummary = isDayFinished && !reviewMode;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col pb-20 selection:bg-blue-500 selection:text-white">
      
      {/* HEADER DARK & SOLID */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 pt-4 pb-2 px-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h1 className="text-xl font-black text-white uppercase tracking-tight leading-none">{program?.title}</h1>
                <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{clientName}</div>
            </div>
            
            {/* Week Selector */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1">
                <button onClick={() => setActiveWeek(w => Math.max(1, w-1))} disabled={activeWeek===1} className="w-8 h-8 flex items-center justify-center text-slate-400 disabled:opacity-20 hover:text-white"><ArrowLeft size={16}/></button>
                <div className="px-3 font-black text-blue-400 text-lg">W{activeWeek}</div>
                <button onClick={() => setActiveWeek(w => Math.min(program.duration||4, w+1))} disabled={activeWeek===(program.duration||4)} className="w-8 h-8 flex items-center justify-center text-slate-400 disabled:opacity-20 hover:text-white"><ArrowRight size={16}/></button>
            </div>
        </div>

        {/* Day Selector */}
        {days.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {days.map((day, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => setActiveDayIndex(idx)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${activeDayIndex === idx ? "bg-white text-slate-950 border-white" : "bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600"}`}
                    >
                        {day.name}
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* CONTENUTO */}
      <div className="flex-1 p-4 max-w-lg mx-auto w-full flex flex-col">
        
        {/* INFO GIORNO */}
        {activeDayNotes && (
            <div className="mb-4 bg-blue-950/30 border border-blue-900/50 p-3 rounded-xl flex gap-3 text-blue-200 text-xs leading-relaxed">
                <Info size={16} className="shrink-0 mt-0.5"/> {activeDayNotes}
            </div>
        )}

        {/* EMPTY STATE */}
        {(!days.length || !exercises.length) && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-4 border-2 border-dashed border-slate-900 rounded-3xl min-h-[300px]">
                <Coffee size={48}/>
                <p className="font-bold">Nessun esercizio oggi</p>
            </div>
        )}

        {/* SUMMARY FINE GIORNO */}
        {showSummary && (
            <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-slate-900 mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                    <Trophy size={48} fill="currentColor"/>
                </div>
                <h2 className="text-3xl font-black text-white italic uppercase mb-2">Workout Finito!</h2>
                <p className="text-slate-400 mb-8 max-w-[250px]">Hai completato tutti gli esercizi. Grande!</p>
                <button onClick={() => setReviewMode(true)} className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl border border-slate-700 hover:bg-slate-700">
                    Rivedi o Modifica Dati
                </button>
            </div>
        )}

        {/* ESERCIZIO CARD (FOCUS MODE) */}
        {ex && !showSummary && (
            <div className="flex-1 flex flex-col gap-4">
                
                {/* Progress Bar */}
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                    <span>Esercizio {activeExerciseIndex + 1} / {totalExercises}</span>
                    <span>{Math.round(((activeExerciseIndex + 1) / totalExercises) * 100)}%</span>
                </div>
                <div className="h-1 bg-slate-900 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${((activeExerciseIndex + 1) / totalExercises) * 100}%` }}></div>
                </div>

                {/* CARD */}
                <div className={`bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col ${confirmFlash ? "ring-2 ring-emerald-500" : ""}`}>
                    
                    {/* Immagine */}
                    <div className="h-48 bg-black relative shrink-0">
                        {ex.image_url ? (
                            <img src={ex.image_url} className="w-full h-full object-cover opacity-60"/>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-800"><Activity size={48}/></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                        
                        {/* Check Completato */}
                        {isDone && (
                            <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-full text-xs font-black uppercase flex items-center gap-1.5 shadow-lg z-10">
                                <CheckCircle2 size={16}/> Completato
                            </div>
                        )}
                    </div>

                    {/* Contenuto */}
                    <div className="p-5 flex-1 flex flex-col -mt-6 relative z-10">
                        <h2 className="text-2xl font-black text-white uppercase leading-none mb-1">{ex.name}</h2>
                        {ex.notes && <p className="text-xs text-slate-400 leading-snug mb-4">{ex.notes}</p>}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2 mb-6">
                            <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-center">
                                <div className="text-[9px] text-slate-500 font-bold uppercase">Sets</div>
                                <div className="text-lg font-black text-white">{ex.sets}</div>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-center">
                                <div className="text-[9px] text-slate-500 font-bold uppercase">Reps</div>
                                <div className="text-lg font-black text-white">{ex.reps}</div>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-center">
                                <div className="text-[9px] text-slate-500 font-bold uppercase">Rest</div>
                                <div className="text-lg font-black text-blue-400">{ex.rest || "-"}</div>
                            </div>
                        </div>

                        {/* ZONA INSERIMENTO / VISUALIZZAZIONE */}
                        <div className="mt-auto">
                            
                            {/* Caso 1: COMPLETATO (Sola lettura) */}
                            {isDone && !isEditing ? (
                                <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-2xl p-4">
                                    <div className="text-emerald-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                                        <CheckCircle2 size={14}/> Dati Registrati
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        {String(currentLog.actual_reps).split('-').map((r,i) => {
                                            const w = String(currentLog.actual_weight).split('-')[i] || '-';
                                            if (!r && w === '-') return null;
                                            return (
                                                <div key={i} className="flex justify-between items-center text-sm border-b border-emerald-900/20 pb-1 last:border-0">
                                                    <span className="font-mono text-slate-500 text-xs">#{i+1}</span>
                                                    <span className="font-bold text-white">{r} <span className="text-slate-600 text-xs font-normal">reps</span></span>
                                                    <span className="font-bold text-emerald-400">{w} <span className="text-emerald-800 text-xs font-normal">kg</span></span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <button onClick={() => openEdit(ex.name, activeDay.name, currentLog)} className="w-full py-3 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition">
                                        Modifica / Correggi
                                    </button>
                                </div>
                            ) : (
                                /* Caso 2: DA FARE / EDITING */
                                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2">
                                    {/* Header Tabella */}
                                    <div className="flex mb-2 px-1 text-[10px] uppercase font-bold text-slate-500">
                                        <div className="w-8 text-center">#</div>
                                        <div className="flex-1 text-center">Reps</div>
                                        <div className="flex-1 text-center">Kg</div>
                                        <div className="w-8"></div>
                                    </div>

                                    {/* Righe Input */}
                                    <div className="space-y-2 mb-4">
                                        {setLogsData.map((row, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="w-8 text-center text-slate-600 font-bold text-xs">{i+1}</div>
                                                <input type="number" placeholder={ex.reps} value={row.reps} onChange={e => updateRow(i, 'reps', e.target.value)} className="flex-1 bg-slate-900 border border-slate-800 text-center text-white h-10 rounded-lg focus:border-blue-500 focus:outline-none font-bold text-lg placeholder:text-slate-700"/>
                                                <input type="number" placeholder="Kg" value={row.weight} onChange={e => updateRow(i, 'weight', e.target.value)} className="flex-1 bg-slate-900 border border-slate-800 text-center text-emerald-400 h-10 rounded-lg focus:border-emerald-500 focus:outline-none font-bold text-lg placeholder:text-slate-800"/>
                                                <button onClick={() => removeSetRow(i)} className="w-8 h-10 flex items-center justify-center text-slate-600 hover:text-red-500"><X size={16}/></button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 mb-4">
                                        <button onClick={addSetRow} className="flex-1 py-2 border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs font-bold hover:bg-slate-900 hover:text-slate-300 transition flex items-center justify-center gap-1">
                                            <Plus size={12}/> Aggiungi Serie
                                        </button>
                                        {isEditing && (
                                            <button onClick={closeEdit} className="px-4 py-2 bg-slate-900 rounded-lg text-slate-400 text-xs font-bold hover:text-white">Annulla</button>
                                        )}
                                    </div>

                                    <textarea 
                                        placeholder="Note opzionali..." 
                                        value={noteInput} 
                                        onChange={e => setNoteInput(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-white mb-4 min-h-[60px] focus:border-blue-500 focus:outline-none resize-none"
                                    />

                                    <button 
                                        onClick={() => saveLog(ex.name, activeDay.name, totalExercises)} 
                                        className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={20}/> CONFERMA E COMPLETA
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* NAVIGAZIONE FOOTER */}
                <div className="flex gap-3 mt-2">
                    <button 
                        onClick={() => goPrev()} 
                        disabled={activeExerciseIndex === 0} 
                        className="flex-1 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={18}/> Precedente
                    </button>
                    <button 
                        onClick={() => goNext(totalExercises)} 
                        disabled={activeExerciseIndex >= totalExercises - 1} 
                        className="flex-1 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition flex items-center justify-center gap-2"
                    >
                        Successivo <ArrowRight size={18}/>
                    </button>
                </div>

            </div>
        )}

      </div>
    </div>
  );
}