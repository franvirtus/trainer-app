"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Dumbbell, Calendar, Info, Clock, Activity, CheckCircle, Check, Circle } from 'lucide-react';

export default function LivePage({ params }) {
  const { id } = use(params);
  
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState({}); // Stato per salvare i log fatti
  const [loading, setLoading] = useState(true);

  const [activeWeek, setActiveWeek] = useState(1);
  const [activeDay, setActiveDay] = useState('');
  const [availableDays, setAvailableDays] = useState([]);

  // INPUT STATE (Cosa scrive l'atleta)
  const [inputs, setInputs] = useState({});

  useEffect(() => {
    fetchData();
  }, [id, activeWeek]); // Ricarica se cambio settimana

  const fetchData = async () => {
    // 1. Scheda
    const { data: prog } = await supabase.from('programs').select('*').eq('id', id).single();
    if (prog) setProgram(prog);

    // 2. Esercizi
    const { data: ex } = await supabase.from('exercises').select('*').eq('program_id', id).order('created_at', { ascending: true });
    
    if (ex && ex.length > 0) {
        setExercises(ex);
        const uniqueDays = [...new Set(ex.map(item => item.day || 'Giorno A'))].sort();
        setAvailableDays(uniqueDays);
        if (!activeDay) setActiveDay(uniqueDays[0]);

        // 3. LOG GIÀ SALVATI (Se l'atleta ricarica la pagina)
        const { data: savedLogs } = await supabase.from('workout_logs')
            .select('*')
            .eq('program_id', id)
            .eq('week_number', activeWeek);
        
        const logsMap = {};
        const inputsMap = {};
        
        if (savedLogs) {
            savedLogs.forEach(log => {
                // Creiamo una chiave unica per ogni esercizio: ID_Giorno
                const key = `${log.exercise_name}_${log.day_label}`; 
                logsMap[key] = true; // Segnato come fatto
                inputsMap[key] = {
                    reps: log.actual_reps,
                    weight: log.actual_weight,
                    notes: log.athlete_notes
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

      // Dati inseriti dall'atleta
      const userIn = inputs[key] || {};

      if (!isCompleted) {
          // SALVA NEL DB
          await supabase.from('workout_logs').insert([{
              program_id: id,
              exercise_name: ex.name,
              week_number: activeWeek,
              day_label: activeDay,
              actual_sets: ex.progression[activeWeek]?.sets, // Usiamo quello pianificato se non c'è input specifico per i set
              actual_reps: userIn.reps || ex.progression[activeWeek]?.reps, // Se vuoto, salva quello pianificato
              actual_weight: userIn.weight || '',
              athlete_notes: userIn.notes || '',
              completed: true
          }]);
          setLogs(prev => ({ ...prev, [key]: true }));
      } else {
          // RIMUOVI (Opzionale: per ora lasciamo che possa solo completare)
          alert("Esercizio già completato!");
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

      <div className="max-w-md mx-auto p-4 space-y-4">
        {currentExercises.map((ex, index) => {
            const weekData = ex.progression?.[activeWeek] || {}; 
            const key = `${ex.name}_${activeDay}`;
            const isDone = logs[key];

            return (
                <div key={index} className={`rounded-2xl border transition-all ${isDone ? 'bg-green-900/20 border-green-800/50' : 'bg-slate-800 border-slate-700'}`}>
                    
                    {/* TITOLO E TARGET */}
                    <div className="p-4 flex justify-between items-start">
                        <div>
                            <h3 className={`text-lg font-bold ${isDone ? 'text-green-400' : 'text-white'}`}>{ex.name}</h3>
                            <div className="flex gap-3 mt-1 text-sm text-slate-400">
                                <span className="font-mono bg-slate-900 px-2 py-0.5 rounded">{weekData.sets} x {weekData.reps}</span>
                                {weekData.rest && <span className="flex items-center gap-1"><Clock size={12}/> {weekData.rest}</span>}
                            </div>
                        </div>
                        
                        {/* TASTO CHECK */}
                        <button 
                            onClick={() => toggleComplete(ex)}
                            disabled={isDone}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isDone ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-500 hover:bg-blue-600 hover:text-white'
                            }`}
                        >
                            {isDone ? <Check size={20}/> : <Circle size={20}/>}
                        </button>
                    </div>

                    {/* AREA INPUT ATLETA (Visibile solo se non completato) */}
                    {!isDone && (
                        <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500">Reps Fatte</label>
                                <input 
                                    type="number" 
                                    placeholder={weekData.reps} 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                                    onChange={(e) => handleInputChange(ex.name, 'reps', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500">Kg Usati</label>
                                <input 
                                    type="number" 
                                    placeholder="Kg" 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                                    onChange={(e) => handleInputChange(ex.name, 'weight', e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
}