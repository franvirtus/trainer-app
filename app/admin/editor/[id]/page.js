"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Copy, ArrowRightCircle } from 'lucide-react';

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
  
  const [activeDay, setActiveDay] = useState('Giorno A');
  const [days, setDays] = useState(['Giorno A']);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    // 1. Carica Programma
    const { data: prog } = await supabase.from('programs').select('*').eq('id', id).single();
    if (prog) setProgram(prog);

    // 2. Carica Esercizi
    const { data: ex } = await supabase.from('exercises').select('*').eq('program_id', id).order('created_at', { ascending: true });
    
    if (ex && ex.length > 0) {
        // Normalizziamo i dati: se 'progression' è vuoto, lo creiamo basandoci sui vecchi campi
        const normalizedEx = ex.map(e => {
            if (!e.progression || Object.keys(e.progression).length === 0) {
                // Migrazione al volo dei vecchi dati
                const defaultProg = {};
                for(let i=1; i<=(prog?.duration || 4); i++) {
                    defaultProg[i] = { 
                        sets: e.sets || '', 
                        reps: e.reps || '', 
                        weight: e.weight || '',
                        rpe: e.rpe || '',
                        rest: e.rest || ''
                    };
                }
                return { ...e, progression: defaultProg };
            }
            return e;
        });
        
        setExercises(normalizedEx);
        const uniqueDays = [...new Set(ex.map(item => item.day || 'Giorno A'))].sort();
        setDays(uniqueDays);
        setActiveDay(uniqueDays[0]);
    }
  };

  const currentExercises = exercises.filter(ex => (ex.day || 'Giorno A') === activeDay);

  const addExercise = () => {
    // Crea una progressione vuota per tutte le settimane
    const emptyProgression = {};
    for(let i=1; i<=(program?.duration || 4); i++) {
        emptyProgression[i] = { sets: '3', reps: '10', weight: '', rpe: '8', rest: '90"' };
    }

    setExercises([...exercises, { 
        name: '', 
        progression: emptyProgression,
        notes: '',
        day: activeDay,
        tempId: Date.now()
    }]);
  };

  const updateExerciseName = (exToUpdate, val) => {
      setExercises(exercises.map(e => (e === exToUpdate ? { ...e, name: val } : e)));
  };

  const updateProgression = (exToUpdate, week, field, val) => {
      const updatedExercises = exercises.map(e => {
          if (e === exToUpdate) {
              const newProg = { ...e.progression };
              if (!newProg[week]) newProg[week] = {};
              newProg[week] = { ...newProg[week], [field]: val };
              return { ...e, progression: newProg };
          }
          return e;
      });
      setExercises(updatedExercises);
  };

  // Funzione Magica: Copia la Settimana 1 su tutte le altre
  const copyWeekOneToAll = (exToUpdate) => {
      const week1Data = exToUpdate.progression['1'];
      const newProg = {};
      for(let i=1; i<=(program?.duration || 4); i++) {
          newProg[i] = { ...week1Data };
      }
      setExercises(exercises.map(e => (e === exToUpdate ? { ...e, progression: newProg } : e)));
  };

  const removeExercise = (ex) => {
      setExercises(exercises.filter(e => e !== ex));
  };
  
  // GESTIONE GIORNI SEMPLIFICATA
  const addNewDay = () => {
    if (days.length >= 7) return;
    const nextChar = String.fromCharCode(65 + days.length);
    const newDay = `Giorno ${nextChar}`;
    setDays([...days, newDay]);
    setActiveDay(newDay);
  };

  const saveAll = async () => {
    setSaving(true);
    // Cancelliamo i vecchi per pulizia
    await supabase.from('exercises').delete().eq('program_id', id);

    const toSave = exercises.map(ex => ({
        program_id: id,
        name: ex.name,
        notes: ex.notes,
        day: ex.day || 'Giorno A',
        progression: ex.progression, // SALVIAMO IL JSON COMPLETO
        // Salviamo anche i campi flat per compatibilità/ricerca, prendendo la week 1 come riferimento
        sets: ex.progression['1']?.sets || '',
        reps: ex.progression['1']?.reps || '',
        weight: ex.progression['1']?.weight || '',
    }));

    if (toSave.length > 0) {
        const { error } = await supabase.from('exercises').insert(toSave);
        if (error) alert("Errore: " + error.message);
        else alert("Salvato! ✅");
    }
    setSaving(false);
    loadData();
  };

  if (!program) return <div className="p-10 text-center">Caricamento...</div>;
  const weeks = Array.from({length: program.duration}, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans pb-40">
      {/* HEADER */}
      <div className="max-w-[95%] mx-auto flex justify-between items-center mb-6 sticky top-2 bg-white/90 backdrop-blur p-4 rounded-xl shadow-sm z-50 border border-slate-200">
          <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
              <div>
                  <h1 className="text-xl font-bold text-slate-800">{program.title}</h1>
                  <p className="text-xs text-slate-500 font-bold uppercase">{program.duration} SETTIMANE • {activeDay}</p>
              </div>
          </div>
          <button onClick={saveAll} disabled={saving} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow hover:bg-black transition">
              <Save size={18}/> {saving ? "..." : "SALVA"}
          </button>
      </div>

      <div className="max-w-[95%] mx-auto">
        {/* TABS GIORNI */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {days.map(day => (
                <button key={day} onClick={() => setActiveDay(day)} className={`px-6 py-3 rounded-xl font-bold text-sm transition shadow-sm ${activeDay === day ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
                    {day}
                </button>
            ))}
            {days.length < 7 && <button onClick={addNewDay} className="px-4 py-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-blue-500 hover:text-blue-600"><Plus/></button>}
        </div>

        {/* LISTA ESERCIZI - MATRIX VIEW */}
        <div className="space-y-8">
            {currentExercises.map((ex, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* INTESTAZIONE ESERCIZIO */}
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-4">
                        <GripVertical className="text-slate-300 cursor-move"/>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome Esercizio</label>
                            <input 
                                type="text" 
                                className="w-full text-lg font-bold bg-transparent outline-none placeholder:text-slate-300"
                                placeholder="Es. Squat Back"
                                value={ex.name}
                                onChange={(e) => updateExerciseName(ex, e.target.value)}
                            />
                        </div>
                        <button onClick={() => copyWeekOneToAll(ex)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 flex items-center gap-1" title="Copia Settimana 1 su tutte">
                            <Copy size={12}/> Copia W1 su tutte
                        </button>
                        <button onClick={() => removeExercise(ex)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                    </div>

                    {/* LA MATRICE (Scrollabile orizzontalmente se ci sono tante settimane) */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                                <tr>
                                    <th className="px-4 py-2 min-w-[80px]">Week</th>
                                    <th className="px-2 py-2 w-20">Sets</th>
                                    <th className="px-2 py-2 w-20">Reps</th>
                                    <th className="px-2 py-2 w-24">Carico</th>
                                    <th className="px-2 py-2 w-20">RPE</th>
                                    <th className="px-2 py-2 w-20">Rest</th>
                                    <th className="px-4 py-2 min-w-[150px]">Note specifiche</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {weeks.map(week => (
                                    <tr key={week} className="hover:bg-slate-50/50 transition">
                                        <td className="px-4 py-3 font-bold text-slate-500 bg-slate-50/30">
                                            W{week}
                                        </td>
                                        <td className="px-2"><input type="text" className="w-full font-bold text-center bg-transparent outline-none border-b border-transparent focus:border-blue-500" value={ex.progression?.[week]?.sets || ''} onChange={(e) => updateProgression(ex, week, 'sets', e.target.value)}/></td>
                                        <td className="px-2"><input type="text" className="w-full font-bold text-center bg-transparent outline-none border-b border-transparent focus:border-blue-500" value={ex.progression?.[week]?.reps || ''} onChange={(e) => updateProgression(ex, week, 'reps', e.target.value)}/></td>
                                        <td className="px-2"><input type="text" className="w-full font-bold text-center bg-transparent outline-none border-b border-transparent focus:border-blue-500" value={ex.progression?.[week]?.weight || ''} onChange={(e) => updateProgression(ex, week, 'weight', e.target.value)}/></td>
                                        <td className="px-2"><input type="text" className="w-full font-bold text-center text-blue-600 bg-transparent outline-none border-b border-transparent focus:border-blue-500" value={ex.progression?.[week]?.rpe || ''} onChange={(e) => updateProgression(ex, week, 'rpe', e.target.value)}/></td>
                                        <td className="px-2"><input type="text" className="w-full font-bold text-center text-slate-500 bg-transparent outline-none border-b border-transparent focus:border-blue-500" value={ex.progression?.[week]?.rest || ''} onChange={(e) => updateProgression(ex, week, 'rest', e.target.value)}/></td>
                                        <td className="px-4"><input type="text" className="w-full text-slate-500 bg-transparent outline-none" placeholder="..." value={ex.progression?.[week]?.note || ''} onChange={(e) => updateProgression(ex, week, 'note', e.target.value)}/></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>

        <button onClick={addExercise} className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 hover:scale-110 transition z-50">
            <Plus size={28}/>
        </button>
      </div>
    </div>
  );
}