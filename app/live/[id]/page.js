"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Dumbbell, Info, Clock, Activity, Check, Plus, X, MessageSquare, History, Edit2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

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

  // STATO POP-UP AVANZATO
  const [editingId, setEditingId] = useState(null);
  // Ora gestiamo un ARRAY di serie, non valori singoli
  const [setLogsData, setSetLogsData] = useState([{ reps: '', weight: '' }]); 
  const [noteInput, setNoteInput] = useState('');

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
                logsMap[key] = log;
            });
        }
        setLogs(logsMap);

        // STORICO
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

  // --- LOGICA PARSING SERIE ---
  // Trasforma "10-10-8" in ['10','10','8'] per poterlo modificare
  const parseSetData = (repsString, weightString) => {
      if (!repsString) return [{ reps: '', weight: '' }];
      const r = repsString.split('-');
      const w = weightString ? weightString.split('-') : [];
      return r.map((rep, i) => ({ reps: rep, weight: w[i] || '' }));
  };

  // APRE IL POP-UP CON LE RIGHE GIUSTE
  const openEdit = (exName, existingData, targetSets) => {
      const key = `${exName}_${activeDay}`;
      setEditingId(key);
      setNoteInput(existingData?.athlete_notes || '');

      if (existingData) {
          // Se esiste già un log, carichiamo quello
          setSetLogsData(parseSetData(existingData.actual_reps, existingData.actual_weight));
      } else {
          // Se è nuovo, creiamo tante righe quante sono le serie target (es. 4)
          // Cerchiamo di capire se targetSets è un numero ("4") o un range ("3-4")
          const numSets = parseInt(targetSets) || 3; // Default 3 se non capisce
          const initialRows = Array.from({ length: numSets }, () => ({ reps: '', weight: '' }));
          setSetLogsData(initialRows);
      }
  };

  const closeEdit = () => {
      setEditingId(null);
      setSetLogsData([]);
      setNoteInput('');
  };

  // AGGIORNA UNA SINGOLA RIGA (ES. SERIE 2)
  const updateRow = (index, field, value) => {
      const newData = [...setLogsData];
      newData[index][field] = value;
      setSetLogsData(newData);
  };

  const addSetRow = () => {
      setSetLogsData([...setSetLogsData, { reps: '', weight: '' }]);
  };

  const removeSetRow = (index) => {
      const newData = setLogsData.filter((_, i) => i !== index);
      setSetLogsData(newData);
  };

  // SALVA NEL DB (Unisce le righe con "-")
  const saveLog = async (ex) => {
      const key = `${ex.name}_${activeDay}`;
      
      // Uniamo i dati: ['10', '10'] diventa "10-10"
      const repsString = setLogsData.map(r => r.reps || '0').join('-');
      const weightString = setLogsData.map(r => r.weight || '0').join('-');

      const { error } = await supabase.from('workout_logs').insert([{
          program_id: id,
          exercise_name: ex.name,
          week_number: activeWeek,
          day_label: activeDay,
          actual_sets: setLogsData.length.toString(), // Salviamo quante serie ha fatto davvero
          actual_reps: repsString,
          actual_weight: weightString,
          athlete_notes: noteInput,
          completed: true
      }]);

      if (!error) {
          setLogs(prev => ({ 
              ...prev, 
              [key]: { 
                  actual_reps: repsString, 
                  actual_weight: weightString, 
                  athlete_notes: noteInput,
                  actual_sets: setLogsData.length.toString()
              } 
          }));
          closeEdit();
      } else {
          alert("Errore: " + error.message);
      }
  };

  const deleteLog = async (ex) => {
      const key = `${ex.name}_${activeDay}`;
      const { error } = await supabase.from('workout_logs').delete().eq('program_id', id).eq('week_number', activeWeek).eq('day_label', activeDay).eq('exercise_name', ex.name);
      if (!error) {
          const oldData = logs[key];
          setLogs(prev => { const n = { ...prev }; delete n[key]; return n; });
          openEdit(ex.name, oldData, ex.progression?.[activeWeek]?.sets);
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
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {Array.from({length: program.duration}, (_, i) => i + 1).map(week => (
                    <button key={week} onClick={() => setActiveWeek(week)} className={`min-w-[40px] h-[40px] rounded-full flex items-center justify-center text-sm font-bold transition-all ${activeWeek === week ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {week}
                    </button>
                ))}
            </div>
            <div className="flex border-b border-slate-700">
                {availableDays.map(day => (
                    <button key={day} onClick={() => setActiveDay(day)} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeDay === day ? 'border-blue-500 text-white' : 'border-transparent text-slate-500'}`}>
                        {day}
                    </button>
                ))}
            </div>
          </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        
        {/* INFO SCHEDA */}
        {program.notes && (
            <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl text-sm text-blue-100">{program.notes}</div>
        )}

        {currentExercises.map((ex, index) => {
            const weekData = ex.progression?.[activeWeek] || {}; 
            const key = `${ex.name}_${activeDay}`;
            const logData = logs[key];
            const isDone = !!logData;
            const history = historyLogs[key];
            const isEditing = editingId === key;

            // Prepariamo i dati per la visualizzazione (split delle stringhe salvate)
            const savedReps = isDone ? logData.actual_reps.split('-') : [];
            const savedWeight = isDone ? logData.actual_weight.split('-') : [];

            return (
                <div key={index} className={`rounded-2xl border transition-all overflow-hidden relative ${isDone ? 'bg-green-900/10 border-green-800/30' : 'bg-slate-800 border-slate-700'}`}>
                    
                    {/* --- MODALITÀ POP-UP (EDIT) --- */}
                    {isEditing ? (
                        <div className="p-4 bg-slate-800 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{ex.name}</h3>
                                    <p className="text-xs text-slate-400">Target: {weekData.sets} x {weekData.reps}</p>
                                </div>
                                <button onClick={closeEdit} className="p-2 bg-slate-700 rounded-full text-slate-400"><X size={20}/></button>
                            </div>

                            {/* LISTA DELLE SERIE */}
                            <div className="space-y-2 mb-4">
                                <div className="flex text-[10px] uppercase font-bold text-slate-500 px-2">
                                    <span className="w-8 text-center">Set</span>
                                    <span className="flex-1 text-center">Reps</span>
                                    <span className="flex-1 text-center">Kg</span>
                                    <span className="w-8"></span>
                                </div>
                                {setLogsData.map((row, i) => (
                                    <div key={i} className="flex gap-2 items-center">
                                        <div className="w-8 h-10 flex items-center justify-center bg-slate-700 rounded-lg text-sm font-bold text-slate-400">{i + 1}</div>
                                        <input 
                                            type="number" 
                                            placeholder={weekData.reps} 
                                            value={row.reps}
                                            onChange={(e) => updateRow(i, 'reps', e.target.value)}
                                            className="flex-1 h-10 bg-slate-900 border border-slate-600 rounded-lg text-center text-white font-bold outline-none focus:border-blue-500"
                                        />
                                        <input 
                                            type="number" 
                                            placeholder={weekData.weight || '-'}
                                            value={row.weight}
                                            onChange={(e) => updateRow(i, 'weight', e.target.value)}
                                            className="flex-1 h-10 bg-slate-900 border border-slate-600 rounded-lg text-center text-white font-bold outline-none focus:border-blue-500"
                                        />
                                        <button onClick={() => removeSetRow(i)} className="w-8 h-10 flex items-center justify-center text-red-400 hover:bg-slate-700 rounded-lg"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                <button onClick={addSetRow} className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 text-xs font-bold hover:text-white hover:border-slate-500 flex items-center justify-center gap-1">
                                    <Plus size={14}/> AGGIUNGI SERIE
                                </button>
                            </div>

                            <textarea 
                                placeholder="Note..." 
                                value={noteInput}
                                rows="2"
                                onChange={(e) => setNoteInput(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-500 resize-none mb-4"
                            />

                            <button onClick={() => saveLog(ex)} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg">
                                <Check size={20}/> SALVA TUTTO
                            </button>
                        </div>
                    ) : (
                        // --- MODALITÀ VISUALIZZAZIONE ---
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className={`text-xl font-bold ${isDone ? 'text-green-400' : 'text-white'}`}>{ex.name}</h3>
                                    
                                    {/* TARGET */}
                                    <div className="flex flex-wrap gap-2 text-xs font-bold mt-1">
                                        <span className="bg-slate-950 px-2 py-1 rounded text-slate-400 border border-slate-800">Target: {weekData.sets} x {weekData.reps}</span>
                                        {weekData.rpe && <span className="text-orange-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">RPE {weekData.rpe}</span>}
                                        {weekData.rest && <span className="text-blue-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">{weekData.rest}</span>}
                                    </div>
                                    
                                    {/* NOTE PT */}
                                    {weekData.note && <div className="text-sm text-slate-400 italic mt-2 border-l-2 border-slate-600 pl-2">"{weekData.note}"</div>}
                                </div>

                                {/* BOTTONE + */}
                                <button 
                                    onClick={() => isDone ? deleteLog(ex) : openEdit(ex.name, logData, weekData.sets)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
                                        isDone ? 'bg-slate-800 border border-slate-700 text-slate-400' : 'bg-blue-600 text-white'
                                    }`}
                                >
                                    {isDone ? <Edit2 size={18}/> : <Plus size={28}/>}
                                </button>
                            </div>

                            {/* TABELLA RISULTATI (Se fatto) */}
                            {isDone && (
                                <div className="bg-black/20 rounded-lg p-3 mt-3">
                                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-2 border-b border-white/10 pb-1">
                                        <span>Set</span>
                                        <span>Reps</span>
                                        <span>Kg</span>
                                    </div>
                                    {savedReps.map((r, i) => (
                                        <div key={i} className="flex justify-between text-sm font-mono text-slate-200 mb-1 last:mb-0">
                                            <span className="text-slate-500 w-4">{i+1}</span>
                                            <span className="font-bold text-white">{r}</span>
                                            <span className="text-blue-300">{savedWeight[i] || '-'}</span>
                                        </div>
                                    ))}
                                    {logData.notes && <div className="mt-2 pt-2 border-t border-white/10 text-xs text-slate-400">Note: {logData.notes}</div>}
                                </div>
                            )}

                            {/* STORICO SETTIMANA SCORSA (Se non fatto) */}
                            {history && !isDone && (
                                <div className="mt-3 bg-slate-900/50 p-2 rounded border border-slate-800">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1 mb-1"><History size={10}/> Settimana Scorsa</div>
                                    <div className="text-xs text-slate-300 font-mono">
                                        {history.actual_reps.split('-').map((r, i) => (
                                            <span key={i} className="mr-2">{r}x{history.actual_weight.split('-')[i]}kg</span>
                                        ))}
                                    </div>
                                </div>
                            )}
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