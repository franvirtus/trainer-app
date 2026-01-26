"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Dumbbell, Calendar, Info, Clock, Activity, Check, Circle, MessageSquare, Target } from 'lucide-react';

export default function LivePage({ params }) {
  const { id } = use(params);
  
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState({}); 
  const [loading, setLoading] = useState(true);

  const [activeWeek, setActiveWeek] = useState(1);
  const [activeDay, setActiveDay] = useState('');
  const [availableDays, setAvailableDays] = useState([]);

  // INPUT STATE
  const [inputs, setInputs] = useState({});

  useEffect(() => {
    fetchData();
  }, [id, activeWeek]); 

  const fetchData = async () => {
    // 1. Carica Scheda
    const { data: prog } = await supabase.from('programs').select('*').eq('id', id).single();
    if (prog) setProgram(prog);

    // 2. Carica Esercizi
    const { data: ex } = await supabase.from('exercises').select('*').eq('program_id', id).order('created_at', { ascending: true });
    
    if (ex && ex.length > 0) {
        setExercises(ex);
        const uniqueDays = [...new Set(ex.map(item => item.day || 'Giorno A'))].sort();
        setAvailableDays(uniqueDays);
        if (!activeDay) setActiveDay(uniqueDays[0]);

        // 3. Carica Log Esistenti
        const { data: savedLogs } = await supabase.from('workout_logs')
            .select('*')
            .eq('program_id', id)
            .eq('week_number', activeWeek);
        
        const logsMap = {};
        const inputsMap = {};
        
        if (savedLogs) {
            savedLogs.forEach(log => {
                const key = `${log.exercise_name}_${log.day_label}`; 
                logsMap[key] = true; 
                inputsMap[key] = {
                    reps: log.actual_reps,
                    weight: log.actual_weight,
                    notes: log.athlete_notes // Recuperiamo le note atleta!
                };
            });
        }
        setLogs(logsMap);
        setInputs(prev => ({...prev, ...inputsMap}));
    }
    setLoading(false);
  };

  const handleInputChange = (exName, field, value) => {
      const key = `${exName}_${activeDay}`;
      setInputs(prev => ({
          ...prev,
          [key]: { ...prev[key], [field]: value }
      }));
  };

  const toggleComplete = async (ex) => {
      const key = `${ex.name}_${activeDay}`;
      const isCompleted = logs[key];
      const userIn = inputs[key] || {};

      if (!isCompleted) {
          // SALVA
          const { error } = await supabase.from('workout_logs').insert([{
              program_id: id,
              exercise_name: ex.name,
              week_number: activeWeek,
              day_label: activeDay,
              actual_sets: ex.progression[activeWeek]?.sets,
              actual_reps: userIn.reps || ex.progression[activeWeek]?.reps,
              actual_weight: userIn.weight || '',
              athlete_notes: userIn.notes || '', // SALVIAMO LE NOTE
              completed: true
          }]);
          
          if (!error) setLogs(prev => ({ ...prev, [key]: true }));

      } else {
          // CANCELLA (UNDO)
          const { error } = await supabase.from('workout_logs')
              .delete()
              .eq('program_id', id)
              .eq('week_number', activeWeek)
              .eq('day_label', activeDay)
              .eq('exercise_name', ex.name);

          if (!error) setLogs(prev => ({ ...prev, [key]: false }));
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
        
        {/* 1. NOTE GENERALI SCHEDA (IN TESTA) */}
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
            const isDone = logs[key];
            const userIn = inputs[key] || {};

            return (
                <div key={index} className={`rounded-2xl border transition-all ${isDone ? 'bg-green-900/10 border-green-800/30' : 'bg-slate-800 border-slate-700'}`}>
                    
                    {/* TITOLO E TARGET */}
                    <div className="p-4 border-b border-slate-700/50">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className={`text-lg font-bold ${isDone ? 'text-green-400' : 'text-white'}`}>{ex.name}</h3>
                            {/* TASTO CHECK */}
                            <button 
                                onClick={() => toggleComplete(ex)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                    isDone ? 'bg-green-600 text-white hover:bg-red-500' : 'bg-slate-700 text-slate-500 hover:bg-blue-600 hover:text-white'
                                }`}
                            >
                                {isDone ? <Check size={20}/> : <Circle size={20}/>}
                            </button>
                        </div>

                        {/* INFO COACH (Target) */}
                        <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                             <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700 text-slate-300">
                                {weekData.sets} x {weekData.reps}
                             </span>
                             
                             {/* 2. VISUALIZZAZIONE CARICO TARGET (PT) */}
                             {weekData.weight && (
                                 <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700 text-yellow-500 flex items-center gap-1">
                                    <Target size={10}/> {weekData.weight} Kg
                                 </span>
                             )}
                             
                             {weekData.rpe && (
                                 <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700 text-orange-400 flex items-center gap-1">
                                    RPE {weekData.rpe}
                                 </span>
                             )}
                             
                             {weekData.rest && (
                                 <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700 text-blue-400 flex items-center gap-1">
                                    {weekData.rest} Rec
                                 </span>
                             )}
                        </div>

                        {/* NOTE DEL PT SULL'ESERCIZIO */}
                        {weekData.note && (
                            <div className="mt-3 text-sm text-slate-300 italic border-l-2 border-slate-600 pl-3">
                                "{weekData.note}"
                            </div>
                        )}
                    </div>

                    {/* AREA INPUT ATLETA */}
                    <div className="p-4 bg-slate-900/30">
                        {!isDone ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Reps Fatte</label>
                                        <input 
                                            type="number" 
                                            placeholder={weekData.reps} 
                                            value={userIn.reps || ''}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 text-center font-bold"
                                            onChange={(e) => handleInputChange(ex.name, 'reps', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Kg Usati</label>
                                        <input 
                                            type="number" 
                                            placeholder={weekData.weight || "Kg"} 
                                            value={userIn.weight || ''}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 text-center font-bold"
                                            onChange={(e) => handleInputChange(ex.name, 'weight', e.target.value)}
                                        />
                                    </div>
                                </div>
                                
                                {/* 3. NOTE DELL'ATLETA */}
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block flex items-center gap-1"><MessageSquare size={10}/> Le tue note</label>
                                    <textarea 
                                        placeholder="Sensazioni, dolori, o note per il coach..." 
                                        value={userIn.notes || ''}
                                        rows="2"
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500 resize-none"
                                        onChange={(e) => handleInputChange(ex.name, 'notes', e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            // RIEPILOGO STATICO (Cosa hai salvato)
                            <div className="space-y-2">
                                <div className="flex gap-4 text-sm text-slate-300">
                                    <span>Reps: <strong className="text-white">{userIn.reps || weekData.reps}</strong></span>
                                    <span>Carico: <strong className="text-white">{userIn.weight || '-'}</strong> Kg</span>
                                </div>
                                {userIn.notes && (
                                    <div className="text-xs text-slate-400 bg-slate-800 p-2 rounded border border-slate-700">
                                        Note: {userIn.notes}
                                    </div>
                                )}
                                <div className="text-xs text-green-500 font-bold flex items-center gap-1 mt-2">
                                    <CheckCircle size={12}/> Esercizio Completato
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
        
        <div className="h-20"></div>
      </div>
    </div>
  );
}