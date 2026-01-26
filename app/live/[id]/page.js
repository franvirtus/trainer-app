"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Dumbbell, Calendar, Info, Clock, Activity, Check, Plus, X, MessageSquare, History, Edit2 } from 'lucide-react';

export default function LivePage({ params }) {
  const { id } = use(params);
  
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState({}); 
  const [historyLogs, setHistoryLogs] = useState({});
  const [loading, setLoading] = useState(true);

  const [activeWeek, setActiveWeek] = useState(1);
  const [activeDay, setActiveDay] = useState('');
  const [availableDays, setAvailableDays] = useState([]);

  // STATO PER GESTIRE I POP-UP (Quale esercizio sto modificando?)
  const [editingId, setEditingId] = useState(null); // ID univoco dell'esercizio in modifica
  const [tempInput, setTempInput] = useState({ reps: '', weight: '', notes: '' });

  useEffect(() => {
    fetchData();
  }, [id, activeWeek]); 

  const fetchData = async () => {
    const { data: prog } = await supabase.from('programs').select('*').eq('id', id).single();
    if (prog) setProgram(prog);

    const { data: ex } = await supabase.from('exercises').select('*').eq('program_id', id).order('created_at', { ascending: true });
    
    if (ex && ex.length > 0) {
        setExercises(ex);
        const uniqueDays = [...new Set(ex.map(item => item.day || 'Giorno A'))].sort();
        setAvailableDays(uniqueDays);
        if (!activeDay) setActiveDay(uniqueDays[0]);

        // LOG ATTUALI
        const { data: savedLogs } = await supabase.from('workout_logs')
            .select('*')
            .eq('program_id', id)
            .eq('week_number', activeWeek);
        
        const logsMap = {};
        
        if (savedLogs) {
            savedLogs.forEach(log => {
                const key = `${log.exercise_name}_${log.day_label}`; 
                logsMap[key] = {
                    reps: log.actual_reps,
                    weight: log.actual_weight,
                    notes: log.athlete_notes
                };
            });
        }
        setLogs(logsMap);

        // STORICO (Settimana precedente)
        if (activeWeek > 1) {
            const { data: history } = await supabase.from('workout_logs')
                .select('*')
                .eq('program_id', id)
                .eq('week_number', activeWeek - 1);
            
            const hMap = {};
            if (history) {
                history.forEach(h => {
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

  // APRE IL POP-UP
  const openEdit = (exName, existingData) => {
      const key = `${exName}_${activeDay}`;
      setEditingId(key);
      setTempInput({
          reps: existingData?.reps || '',
          weight: existingData?.weight || '',
          notes: existingData?.notes || ''
      });
  };

  // CHIUDE IL POP-UP SENZA SALVARE
  const closeEdit = () => {
      setEditingId(null);
      setTempInput({ reps: '', weight: '', notes: '' });
  };

  // SALVA (SBAFFO)
  const saveLog = async (ex) => {
      // Validazione Pigrizia: Se è tutto vuoto, salviamo comunque come "Fatto"
      const key = `${ex.name}_${activeDay}`;

      const { error } = await supabase.from('workout_logs').insert([{
          program_id: id,
          exercise_name: ex.name,
          week_number: activeWeek,
          day_label: activeDay,
          actual_sets: ex.progression[activeWeek]?.sets,
          actual_reps: tempInput.reps,
          actual_weight: tempInput.weight,
          athlete_notes: tempInput.notes,
          completed: true
      }]);

      if (!error) {
          // Aggiorna lo stato locale
          setLogs(prev => ({ 
              ...prev, 
              [key]: { 
                  reps: tempInput.reps, 
                  weight: tempInput.weight, 
                  notes: tempInput.notes 
              } 
          }));
          closeEdit();
      } else {
          alert("Errore: " + error.message);
      }
  };

  // RIAPRE PER MODIFICHE (Cancella il log precedente per riscriverlo)
  const deleteLog = async (ex) => {
      const key = `${ex.name}_${activeDay}`;
      
      const { error } = await supabase.from('workout_logs')
          .delete()
          .eq('program_id', id)
          .eq('week_number', activeWeek)
          .eq('day_label', activeDay)
          .eq('exercise_name', ex.name);

      if (!error) {
          const oldData = logs[key];
          setLogs(prev => {
              const newState = { ...prev };
              delete newState[key];
              return newState;
          });
          // Riapre subito il pop-up con i vecchi dati per modificarli
          openEdit(ex.name, oldData);
      }
  };

  const currentExercises = exercises.filter(ex => (ex.day || 'Giorno A') === activeDay);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-32">
      
      {/* HEADER */}
      <div className="bg-slate-800/90 backdrop-blur sticky top-0 z-20 border-b border-slate-700 shadow-xl pt-4">
          <div className="px-4 max-w-md mx-auto">
            <h1 className="text-xl font-bold text-white mb-2">{program.title}</h1>
            
            {/* WEEK SELECTOR */}
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {Array.from({length: program.duration}, (_, i) => i + 1).map(week => (
                    <button 
                        key={week}
                        onClick={() => setActiveWeek(week)}
                        className={`min-w-[40px] h-[40px] rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                            activeWeek === week ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
                        }`}
                    >
                        {week}
                    </button>
                ))}
            </div>

            {/* DAY SELECTOR */}
            <div className="flex border-b border-slate-700">
                {availableDays.map(day => (
                    <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                            activeDay === day ? 'border-blue-500 text-white' : 'border-transparent text-slate-500'
                        }`}
                    >
                        {day}
                    </button>
                ))}
            </div>
          </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* OBIETTIVI SCHEDA */}
        {program.notes && (
            <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl flex gap-3">
                <Info size={20} className="text-blue-400 shrink-0 mt-0.5"/>
                <div>
                    <h4 className="text-xs font-bold text-blue-400 uppercase mb-1">Obiettivi Scheda</h4>
                    <p className="text-sm text-blue-100 leading-relaxed whitespace-pre-wrap">{program.notes}</p>
                </div>
            </div>
        )}

        {currentExercises.map((ex, index) => {
            const weekData = ex.progression?.[activeWeek] || {}; 
            const key = `${ex.name}_${activeDay}`;
            const logData = logs[key]; // Dati salvati (se esistono)
            const isDone = !!logData;
            const history = historyLogs[key]; // Storico settimana prima
            const isEditing = editingId === key; // Sto modificando questo specifico esercizio?

            return (
                <div key={index} className={`rounded-2xl border transition-all overflow-hidden relative ${isDone ? 'bg-green-900/10 border-green-800/30' : 'bg-slate-800 border-slate-700'}`}>
                    
                    {/* --- MODALITÀ "POP-UP" (EDITING) --- */}
                    {isEditing ? (
                        <div className="p-4 bg-slate-800 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white">{ex.name}</h3>
                                <button onClick={closeEdit} className="p-2 bg-slate-700 rounded-full text-slate-400 hover:text-white">
                                    <X size={20}/>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Reps Fatte</label>
                                        <input 
                                            autoFocus
                                            type="text" 
                                            placeholder={weekData.reps} 
                                            value={tempInput.reps}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white outline-none focus:border-blue-500 text-center font-bold text-xl"
                                            onChange={(e) => setTempInput({...tempInput, reps: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Kg Usati</label>
                                        <input 
                                            type="text" 
                                            placeholder={weekData.weight || "-"} 
                                            value={tempInput.weight}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white outline-none focus:border-blue-500 text-center font-bold text-xl"
                                            onChange={(e) => setTempInput({...tempInput, weight: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Note per la prossima volta</label>
                                    <textarea 
                                        placeholder="Note..." 
                                        value={tempInput.notes}
                                        rows="2"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-500 resize-none"
                                        onChange={(e) => setTempInput({...tempInput, notes: e.target.value})}
                                    />
                                </div>

                                <button 
                                    onClick={() => saveLog(ex)}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all"
                                >
                                    <Check size={24}/> SALVA RISULTATO
                                </button>
                            </div>
                        </div>
                    ) : (
                        // --- MODALITÀ VISUALIZZAZIONE (TARGET + STORICO) ---
                        <div className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className={`text-xl font-bold mb-1 ${isDone ? 'text-green-400' : 'text-white'}`}>{ex.name}</h3>
                                    
                                    {/* TARGET DEL COACH */}
                                    <div className="flex gap-2 text-xs font-bold text-slate-400 mb-2">
                                        <span className="bg-slate-900 px-2 py-1 rounded text-slate-300 border border-slate-700">
                                            {weekData.sets} x {weekData.reps}
                                        </span>
                                        {weekData.rpe && <span className="text-orange-400 bg-slate-900 px-2 py-1 rounded border border-slate-700">RPE {weekData.rpe}</span>}
                                        {weekData.rest && <span className="text-blue-400 bg-slate-900 px-2 py-1 rounded border border-slate-700">{weekData.rest}</span>}
                                    </div>

                                    {/* STORICO SETTIMANA SCORSA */}
                                    {history && !isDone && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900/50 p-2 rounded-lg border border-slate-800 w-fit">
                                            <History size={12}/> 
                                            <span>Scorsa: <strong>{history.actual_reps || '-'}</strong> @ <strong>{history.actual_weight || '-'}</strong></span>
                                        </div>
                                    )}

                                    {/* RISULTATO SALVATO (Se fatto) */}
                                    {isDone && (
                                        <div className="mt-2 text-sm">
                                            <div className="text-white">
                                                Fatto: <strong>{logData.reps || weekData.reps}</strong> @ <strong>{logData.weight || '-'}</strong>
                                            </div>
                                            {logData.notes && <div className="text-xs text-slate-400 italic mt-1">"{logData.notes}"</div>}
                                        </div>
                                    )}
                                </div>

                                {/* BOTTONE AZIONE (+ o EDIT) */}
                                {isDone ? (
                                    <button 
                                        onClick={() => deleteLog(ex)}
                                        className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center hover:bg-slate-700 transition"
                                    >
                                        <Edit2 size={18}/>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => openEdit(ex.name, null)}
                                        className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-500 active:scale-95 transition-all"
                                    >
                                        <Plus size={28}/>
                                    </button>
                                )}
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