"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Dumbbell, Calendar, Info, CheckCircle2 } from 'lucide-react';

export default function LivePage({ params }) {
  const { id } = use(params);
  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]); // Qui metteremo gli esercizi
  const [loading, setLoading] = useState(true);

  // --- CHIAVI DIRETTE ---
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);
  // ---------------------

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    // 1. Scarica i dettagli della scheda
    const { data: prog } = await supabase.from('programs').select('*').eq('id', id).single();
    if (prog) setProgram(prog);

    // 2. Scarica gli esercizi collegati
    const { data: ex } = await supabase
        .from('exercises')
        .select('*')
        .eq('program_id', id)
        .order('created_at', { ascending: true }); // Ordine di inserimento
    
    if (ex) setExercises(ex);
    
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500">Caricamento...</div>;
  if (!program) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400">Scheda non trovata.</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 pb-20">
      <div className="max-w-md mx-auto">
        
        {/* HEADER SCHEDA */}
        <div className="mb-8 pt-6">
            <span className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2 block">Scheda Allenamento</span>
            <h1 className="text-3xl font-bold text-white mb-2">{program.title}</h1>
            <div className="flex items-center gap-4 text-slate-400 text-sm">
                <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(program.created_at).toLocaleDateString('it-IT')}</span>
            </div>
        </div>

        {/* LISTA ESERCIZI */}
        <div className="space-y-4">
            {exercises.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-2xl text-slate-600">
                    <Dumbbell size={32} className="mx-auto mb-2 opacity-50"/>
                    <p>Nessun esercizio in questa scheda.</p>
                </div>
            ) : (
                exercises.map((ex, index) => (
                    <div key={ex.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm relative overflow-hidden">
                        {/* Numero Esercizio */}
                        <div className="absolute top-0 right-0 bg-slate-700 px-3 py-1 rounded-bl-xl text-xs font-bold text-slate-400">
                            #{index + 1}
                        </div>

                        <h3 className="text-xl font-bold text-white mb-4 pr-8">{ex.name}</h3>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center border border-slate-700/50">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Serie</div>
                                <div className="text-lg font-bold text-blue-400">{ex.sets}</div>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center border border-slate-700/50">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Reps</div>
                                <div className="text-lg font-bold text-blue-400">{ex.reps}</div>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded-lg text-center border border-slate-700/50">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Carico</div>
                                <div className="text-lg font-bold text-white">{ex.weight || "-"}</div>
                            </div>
                        </div>

                        {ex.notes && (
                            <div className="flex gap-2 items-start text-sm text-slate-400 bg-slate-900/30 p-3 rounded-lg">
                                <Info size={16} className="shrink-0 mt-0.5 text-blue-500"/>
                                <p>{ex.notes}</p>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
        
        {/* FOOTER */}
        <div className="mt-10 text-center">
            <button className="bg-green-600 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:bg-green-500 transition w-full flex justify-center items-center gap-2">
                <CheckCircle2 size={20}/> COMPLETA ALLENAMENTO
            </button>
        </div>

      </div>
    </div>
  );
}