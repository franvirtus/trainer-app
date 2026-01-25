"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Copy, Layers } from 'lucide-react';

export default function EditorPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  
  // --- CHIAVI DIRETTE ---
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);
  // ---------------------

  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  
  // STATO PER I GIORNI
  const [days, setDays] = useState(['Giorno A']); // Lista dei giorni presenti
  const [activeDay, setActiveDay] = useState('Giorno A'); // Giorno che stai guardando ora

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    // 1. Carica info scheda
    const { data: prog } = await supabase.from('programs').select('*').eq('id', id).single();
    if (prog) setProgram(prog);

    // 2. Carica esercizi
    const { data: ex } = await supabase.from('exercises').select('*').eq('program_id', id).order('created_at', { ascending: true });
    
    if (ex && ex.length > 0) {
        setExercises(ex);
        // Estrai i giorni unici presenti nel DB
        const uniqueDays = [...new Set(ex.map(item => item.day || 'Giorno A'))];
        setDays(uniqueDays);
        setActiveDay(uniqueDays[0]);
    }
  };

  // Filtra gli esercizi per mostrarli solo nel giorno attivo
  const currentExercises = exercises.filter(ex => (ex.day || 'Giorno A') === activeDay);

  const addExercise = () => {
    setExercises([...exercises, { 
        name: '', sets: '3', reps: '10', weight: '', notes: '', 
        day: activeDay, // Assegna l'esercizio al giorno corrente
        tempId: Date.now() // ID temporaneo per gestire la UI
    }]);
  };

  const updateExercise = (exerciseToUpdate, field, value) => {
    const updatedList = exercises.map(ex => {
        // Identifica l'esercizio univocamente (usando ID se c'è, o tempId se è nuovo)
        const isTarget = ex.id ? ex.id === exerciseToUpdate.id : ex.tempId === exerciseToUpdate.tempId;
        if (isTarget) {
            return { ...ex, [field]: value };
        }
        return ex;
    });
    setExercises(updatedList);
  };

  const removeExercise = (exerciseToRemove) => {
    const updatedList = exercises.filter(ex => ex !== exerciseToRemove);
    setExercises(updatedList);
  };

  // --- LOGICA GIORNI ---
  const addNewDay = () => {
      const newDayName = `Giorno ${String.fromCharCode(65 + days.length)}`; // Genera A, B, C...
      setDays([...days, newDayName]);
      setActiveDay(newDayName);
  };

  const duplicateDay = () => {
      if(!confirm(`Vuoi duplicare tutti gli esercizi del ${activeDay}?`)) return;
      
      const newDayName = `Giorno ${String.fromCharCode(65 + days.length)}`;
      
      // Prendi gli esercizi del giorno corrente e copiali con il nuovo nome del giorno
      const exercisesToCopy = currentExercises.map(ex => ({
          ...ex,
          id: undefined, // Rimuovi ID per crearne di nuovi
          tempId: Date.now() + Math.random(),
          day: newDayName
      }));

      setExercises([...exercises, ...exercisesToCopy]);
      setDays([...days, newDayName]);
      setActiveDay(newDayName);
  };

  const saveAll = async () => {
    setSaving(true);
    
    // 1. Cancelliamo i vecchi (metodo brutale ma efficace per ora)
    await supabase.from('exercises').delete().eq('program_id', id);

    // 2. Prepariamo i dati per Supabase (puliamo tempId)
    const cleanExercises = exercises.map(ex => ({
        program_id: id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        notes: ex.notes,
        day: ex.day || 'Giorno A' // Salviamo il giorno!
    }));

    if (cleanExercises.length > 0) {
        const { error } = await supabase.from('exercises').insert(cleanExercises);
        if (error) alert("Errore: " + error.message);
        else alert("Scheda salvata! ✅");
    } else {
        alert("Scheda salvata (vuota).");
    }
    setSaving(false);
    // Ricarichiamo i dati per avere gli ID veri
    loadData();
  };

  if (!program) return <div className="p-10 text-center">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans pb-40">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50/95 backdrop-blur py-4 z-20 border-b border-slate-200">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-slate-200 rounded-full"><ArrowLeft size={20}/></button>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">{program.title}</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Editor Scheda</p>
                </div>
            </div>
            <button onClick={saveAll} disabled={saving} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow hover:scale-105 transition">
                <Save size={18}/> {saving ? "..." : "Salva"}
            </button>
        </div>

        {/* BARRA DEI GIORNI (Tabs) */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
            {days.map(day => (
                <button 
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-5 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                        activeDay === day 
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200' 
                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    {day}
                </button>
            ))}
            
            <button onClick={addNewDay} className="px-4 py-2 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition flex items-center gap-1">
                <Plus size={16}/> Giorno
            </button>
        </div>

        {/* TOOLBAR DEL GIORNO ATTIVO */}
        <div className="flex justify-between items-center mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                <Layers size={20}/> {activeDay}
            </h2>
            <button onClick={duplicateDay} className="text-xs font-bold text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-600 hover:text-white transition flex items-center gap-2">
                <Copy size={14}/> Duplica questo giorno
            </button>
        </div>

        {/* LISTA ESERCIZI DEL GIORNO ATTIVO */}
        <div className="space-y-3">
            {currentExercises.length === 0 && (
                <div className="text-center py-10 opacity-50">Nessun esercizio nel {activeDay}</div>
            )}

            {currentExercises.map((ex, index) => (
                <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 items-start group hover:border-blue-400 transition">
                    <div className="mt-3 text-slate-300"><GripVertical size={20}/></div>
                    
                    <div className="flex-1 grid gap-4">
                        <div className="flex gap-3 items-center">
                            <input 
                                type="text" 
                                placeholder="Nome Esercizio" 
                                className="flex-1 font-bold text-lg text-slate-800 outline-none placeholder:text-slate-300 bg-transparent"
                                value={ex.name}
                                onChange={(e) => updateExercise(ex, 'name', e.target.value)}
                            />
                            <button onClick={() => removeExercise(ex)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Serie</label>
                                <input type="text" value={ex.sets} onChange={(e) => updateExercise(ex, 'sets', e.target.value)} className="w-full bg-transparent font-bold text-slate-700 outline-none"/>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Reps</label>
                                <input type="text" value={ex.reps} onChange={(e) => updateExercise(ex, 'reps', e.target.value)} className="w-full bg-transparent font-bold text-slate-700 outline-none"/>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Carico</label>
                                <input type="text" value={ex.weight} onChange={(e) => updateExercise(ex, 'weight', e.target.value)} className="w-full bg-transparent font-bold text-slate-700 outline-none"/>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Note</label>
                                <input type="text" value={ex.notes} onChange={(e) => updateExercise(ex, 'notes', e.target.value)} className="w-full bg-transparent text-sm text-slate-600 outline-none"/>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* FAB ADD BUTTON */}
        <button onClick={addExercise} className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 hover:scale-110 transition z-50">
            <Plus size={28}/>
        </button>

      </div>
    </div>
  );
}