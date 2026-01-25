"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react';

export default function EditorPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);

  // --- CHIAVI DIRETTE ---
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);
  // ---------------------

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    const { data: prog } = await supabase.from('programs').select('*').eq('id', id).single();
    if (prog) setProgram(prog);

    const { data: ex } = await supabase.from('exercises').select('*').eq('program_id', id).order('created_at', { ascending: true });
    if (ex) setExercises(ex);
  };

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: '3', reps: '10', weight: '', notes: '' }]);
  };

  const updateExercise = (index, field, value) => {
    const newExercises = [...exercises];
    newExercises[index][field] = value;
    setExercises(newExercises);
  };

  const removeExercise = (index) => {
    const newExercises = [...exercises];
    newExercises.splice(index, 1);
    setExercises(newExercises);
  };

  const saveAll = async () => {
    setSaving(true);
    
    // 1. Cancelliamo i vecchi per riscriverli
    await supabase.from('exercises').delete().eq('program_id', id);

    // 2. Prepariamo i dati (SENZA LE NOTE per evitare il crash)
    const exercisesToSave = exercises.map(ex => ({
        program_id: id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight
        // notes: ex.notes  <-- RIMOSSO PERCHÉ MANCA LA COLONNA NEL DB
    }));

    // 3. Salviamo
    if (exercisesToSave.length > 0) {
        const { error } = await supabase.from('exercises').insert(exercisesToSave);
        if (error) {
            alert("Errore salvataggio: " + error.message);
        } else {
            alert("Scheda salvata con successo! ✅");
        }
    } else {
         alert("Scheda salvata (nessun esercizio) ✅");
    }
    
    setSaving(false);
  };

  if (!program) return <div className="p-10 text-center">Caricamento editor...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans pb-32">
      <div className="max-w-4xl mx-auto">
        
        <button onClick={() => router.back()} className="flex items-center text-slate-500 mb-6 hover:text-blue-600 gap-2 font-bold text-sm">
            <ArrowLeft size={18}/> Torna all'Atleta
        </button>

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8 sticky top-2 bg-slate-50 py-4 z-10">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Modifica Scheda</h1>
                <p className="text-slate-500">{program.title}</p>
            </div>
            <button onClick={saveAll} disabled={saving} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-green-700 hover:scale-105 transition">
                <Save size={20}/> {saving ? "Salvataggio..." : "SALVA TUTTO"}
            </button>
        </div>

        {/* LISTA */}
        <div className="space-y-4">
            {exercises.map((ex, index) => (
                <div key={index} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex gap-4 items-start group hover:border-blue-300 transition">
                    <div className="mt-3 text-slate-300 cursor-move"><GripVertical size={20}/></div>
                    
                    <div className="flex-1 grid gap-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Esercizio</label>
                                <input 
                                    type="text" 
                                    placeholder="Es. Panca Piana" 
                                    className="w-full font-bold text-lg text-slate-800 outline-none placeholder:text-slate-300 bg-transparent"
                                    value={ex.name}
                                    onChange={(e) => updateExercise(index, 'name', e.target.value)}
                                />
                            </div>
                            <button onClick={() => removeExercise(index)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                        </div>

                        <div className="flex gap-3">
                            <div className="w-20">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serie</label>
                                <input type="text" value={ex.sets} onChange={(e) => updateExercise(index, 'sets', e.target.value)} className="w-full bg-slate-50 p-2 rounded-lg font-bold text-center border border-slate-100 focus:border-blue-500 outline-none"/>
                            </div>
                            <div className="w-20">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reps</label>
                                <input type="text" value={ex.reps} onChange={(e) => updateExercise(index, 'reps', e.target.value)} className="w-full bg-slate-50 p-2 rounded-lg font-bold text-center border border-slate-100 focus:border-blue-500 outline-none"/>
                            </div>
                            <div className="w-24">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carico (Kg)</label>
                                <input type="text" value={ex.weight} onChange={(e) => updateExercise(index, 'weight', e.target.value)} className="w-full bg-slate-50 p-2 rounded-lg font-bold text-center border border-slate-100 focus:border-blue-500 outline-none"/>
                            </div>
                            
                            {/* CAMPO NOTE (Visibile ma non salvato) */}
                            <div className="flex-1 opacity-50">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Note (Disabilitate)</label>
                                <input disabled type="text" placeholder="Non salvate nel DB" value={ex.notes} className="w-full bg-slate-100 p-2 rounded-lg text-sm border border-slate-100 outline-none text-slate-400 cursor-not-allowed"/>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* ADD BUTTON */}
        <button onClick={addExercise} className="w-full mt-6 py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition flex justify-center items-center gap-2">
            <Plus size={24}/> AGGIUNGI ESERCIZIO
        </button>

      </div>
    </div>
  );
}