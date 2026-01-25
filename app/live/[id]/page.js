"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Dumbbell, Calendar, Info, Clock, Activity, ChevronRight, CheckCircle2, StickyNote } from 'lucide-react';

export default function LivePage({ params }) {
  const { id } = use(params);
  
  // --- CHIAVI DIRETTE ---
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);
  // ---------------------

  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  // STATI PER LA NAVIGAZIONE
  const [activeWeek, setActiveWeek] = useState(1); // Settimana corrente
  const [activeDay, setActiveDay] = useState(''); // Giorno corrente (A, B...)
  const [availableDays, setAvailableDays] = useState([]); // Lista giorni (A, B...)

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    // 1. Scarica Scheda
    const { data: prog } = await supabase.from('programs').select('*').eq('id', id).single();
    if (prog) setProgram(prog);

    // 2. Scarica Esercizi
    const { data: ex } = await supabase
        .from('exercises')
        .select('*')
        .eq('program_id', id)
        .order('created_at', { ascending: true });
    
    if (ex && ex.length > 0) {
        setExercises(ex);
        // Trova i giorni disponibili e ordina
        const uniqueDays = [...new Set(ex.map(item => item.day || 'Giorno A'))].sort();
        setAvailableDays(uniqueDays);
        setActiveDay(uniqueDays[0]); // Imposta il primo giorno come default
    }
    
    setLoading(false);
  };

  // Filtra esercizi per il giorno selezionato
  const currentExercises = exercises.filter(ex => (ex.day || 'Giorno A') === activeDay);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500">Caricamento...</div>;
  if (!program) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400">Scheda non trovata.</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-32">
      
      {/* HEADER FISSO */}
      <div className="bg-slate-800/90 backdrop-blur sticky top-0 z-20 border-b border-slate-700 shadow-xl">
          <div className="p-4 max-w-md mx-auto">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white leading-none mb-1">{program.title}</h1>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                        <Calendar size={12}/> {program.duration} Settimane
                    </div>
                </div>
            </div>

            {/* SELETTORE SETTIMANA (SCROLLABLE) */}
            <div className="mb-2">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 ml-1">Seleziona Settimana</div>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {Array.from({length: program.duration}, (_, i) => i + 1).map(week => (
                        <button 
                            key={week}
                            onClick={() => setActiveWeek(week)}
                            className={`min-w-[45px] h-[45px] rounded-xl flex flex-col items-center justify-center border transition-all ${
                                activeWeek === week 
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50' 
                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                            }`}
                        >
                            <span className="text-[9px] uppercase font-bold opacity-60">Week</span>
                            <span className="text-lg font-bold leading-none">{week}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* SELETTORE GIORNO (TABS) */}
            <div className="flex border-b border-slate-700">
                {availableDays.map(day => (
                    <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                            activeDay === day 
                            ? 'border-blue-500 text-white' 
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {day}
                    </button>
                ))}
            </div>
          </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* NOTE GENERALI SCHEDA (Se presenti) */}
        {program.notes && (
            <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl flex gap-3">
                <Info size={20} className="text-blue-400 shrink-0"/>
                <div>
                    <h4 className="text-xs font-bold text-blue-400 uppercase mb-1">Note del Coach</h4>
                    <p className="text-sm text-blue-100 leading-relaxed">{program.notes}</p>
                </div>
            </div>
        )}

        {/* LISTA ESERCIZI */}
        {currentExercises.length === 0 ? (
            <div className="text-center py-10 opacity-50">Nessun esercizio per {activeDay}</div>
        ) : (
            currentExercises.map((ex, index) => {
                // RECUPERIAMO I DATI DELLA SETTIMANA ATTIVA DAL JSON
                // Se non esistono dati per questa settimana, usiamo un fallback vuoto
                const weekData = ex.progression?.[activeWeek] || {}; 

                return (
                    <div key={index} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg relative group">
                        
                        {/* INTESTAZIONE ESERCIZIO */}
                        <div className="p-5 border-b border-slate-700/50 bg-slate-800 relative">
                            <div className="absolute top-0 right-0 bg-slate-700 px-3 py-1.5 rounded-bl-xl text-xs font-bold text-slate-400 font-mono">
                                #{index + 1}
                            </div>
                            <h3 className="text-xl font-bold text-white pr-10">{ex.name}</h3>
                            
                            {/* PARAMETRI CHIAVE (RPE, REST, TEMPO) */}
                            <div className="flex gap-4 mt-3">
                                {weekData.rest && (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-900/50 px-2 py-1 rounded">
                                        <Clock size={12} className="text-blue-400"/> {weekData.rest} Rec
                                    </div>
                                )}
                                {weekData.rpe && (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-900/50 px-2 py-1 rounded">
                                        <Activity size={12} className="text-orange-400"/> RPE {weekData.rpe}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* DATI SETTIMANA CORRENTE */}
                        <div className="p-5 grid grid-cols-3 gap-3 bg-slate-800/50">
                            <div className="bg-slate-900 p-3 rounded-xl text-center border border-slate-700">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Serie</div>
                                <div className="text-2xl font-bold text-white">{weekData.sets || "-"}</div>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-xl text-center border border-slate-700">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Reps</div>
                                <div className="text-2xl font-bold text-white">{weekData.reps || "-"}</div>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-xl text-center border border-slate-700">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Kg</div>
                                <div className="text-2xl font-bold text-blue-400">{weekData.weight || "-"}</div>
                            </div>
                        </div>

                        {/* NOTE SPECIFICHE ESERCIZIO (Della settimana) */}
                        {weekData.note && (
                            <div className="mx-5 mb-5 mt-0 bg-yellow-900/10 border border-yellow-700/30 p-3 rounded-xl flex gap-3 items-start">
                                <StickyNote size={16} className="text-yellow-500 shrink-0 mt-0.5"/>
                                <p className="text-sm text-yellow-100/80 italic">{weekData.note}</p>
                            </div>
                        )}

                        {/* INPUT PER ATLETA (Placeholder per il futuro) */}
                        <div className="px-5 pb-5 pt-0">
                            <button className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold text-slate-300 flex items-center justify-center gap-2 transition-colors">
                                <CheckCircle2 size={16}/> Segna come completato
                            </button>
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
}