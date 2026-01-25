"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, use } from 'react'; // Aggiunto 'use'
import { createClient } from '@supabase/supabase-js';
import { Dumbbell, Calendar, Clock, CheckCircle } from 'lucide-react';

export default function LivePage({ params }) {
  const { id } = use(params); // Sboxing corretto dei params
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- CHIAVI DIRETTE ---
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  // ---------------------

  useEffect(() => {
    fetchProgram();
  }, [id]);

  const fetchProgram = async () => {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) console.error("Errore:", error);
    if (data) setProgram(data);
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center text-white bg-slate-900 min-h-screen">Caricamento scheda...</div>;
  if (!program) return <div className="p-10 text-center text-red-400 bg-slate-900 min-h-screen">Scheda non trovata.</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4">
      <div className="max-w-md mx-auto">
        {/* Intestazione */}
        <div className="mb-8 pt-4">
            <h1 className="text-3xl font-bold text-white mb-2">{program.title}</h1>
            <div className="flex items-center gap-4 text-slate-400 text-sm">
                <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(program.created_at).toLocaleDateString('it-IT')}</span>
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">LIVE</span>
            </div>
        </div>

        {/* Note del Coach */}
        {program.notes && (
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Note del Coach</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{program.notes}</p>
            </div>
        )}

        {/* Placeholder Esercizi (Per ora vuoto) */}
        <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500">
            <Dumbbell size={48} className="mx-auto mb-4 opacity-50"/>
            <p>Nessun esercizio inserito.</p>
        </div>

      </div>
    </div>
  );
}