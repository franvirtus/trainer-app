"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Copy, Edit3 } from 'lucide-react';

export default function EditorPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState([]); // Libreria per suggerimenti
  
  const [activeDay, setActiveDay] = useState('Giorno A');
  const [days, setDays] = useState(['Giorno A']);
  const [viewWeek, setViewWeek] = useState(1);

  useEffect(() => {
    if (id) {
        loadData();
        loadLibrary();
    }
  }, [id]);

  const loadLibrary = async () => {
      const { data } = await supabase.from('exercise_library').select('name');
      if(data) setExerciseLibrary(data.map(e => e.name));
  };

  const loadData = async () => {
    const { data: prog } = await supabase.from('programs').select('*').eq('id', id).single();
    if (prog) setProgram(prog);

    const { data: ex } = await supabase.from('exercises').select('*').eq('program_id', id).order('created_at', { ascending: true });
    
    if (ex && ex.length > 0) {
        // Normalizzazione dati
        const normalizedEx = ex.map(e => {
            if (!e.progression || Object.keys(e.progression).length === 0) {
                const defaultProg = {};
                for(let i=1; i<=(prog?.duration || 4); i++) {
                    defaultProg[i] = { sets: e.sets || '', reps: e.reps || '', weight: e.weight || '', rpe: '', rest: '' };
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
    const emptyProgression = {};
    for(let i=1; i<=(program?.duration || 4); i++) {
        emptyProgression[i] = { sets: '3', reps: '10', weight: '', rpe: '', rest: '90"' };
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

  const updateProgression = (exToUpdate, field, val) => {
      const updatedExercises = exercises.map(e => {
          if (e === exToUpdate) {
              const newProg = { ...e.progression };
              if (!newProg[viewWeek]) newProg[viewWeek] = {};
              newProg[viewWeek] = { ...newProg[viewWeek], [field]: val };
              return { ...e, progression: newProg };
          }
          return e;
      });
      setExercises(updatedExercises);
  };
  
  const updateNotes = (exToUpdate, val) => {
      setExercises(exercises.map(e => (e === exToUpdate ? { ...e, notes: val } : e)));
  };

  // --- RINOMINA GIORNO ---
  const renameDay = () => {
      const newName = prompt(`Rinomina "${activeDay}" in:`, activeDay);
      if(!newName || newName === activeDay) return;

      // Aggiorna la lista dei giorni
      setDays(days.map(d => d === activeDay ? newName : d));
      
      // Aggiorna tutti gli esercizi di quel giorno
      setExercises(exercises.map(e => (e.day || 'Giorno A') === activeDay ? { ...e, day: newName } : e));
      
      setActiveDay(newName);
  };

  const copyCurrentWeekToAll = () => {
      if(!confirm(`Vuoi copiare i parametri della Settimana ${viewWeek} su TUTTE le altre settimane per questo giorno?`)) return;

      const updatedExercises = exercises.map(ex => {
          if ((ex.day || 'Giorno A') === activeDay) {
              const sourceData = ex.progression[viewWeek];
              const newProg = { ...ex.progression };
              for(let i=1; i<=(program?.duration || 4); i++) {
                  newProg[i] = { ...sourceData };
              }
              return { ...ex, progression: newProg };
          }
          return ex;
      });
      setExercises(updatedExercises);
      alert("Fatto! Tutte le settimane ora sono uguali alla " + viewWeek);
  };

  const removeExercise = (ex) => {
      setExercises(exercises.filter(e => e !== ex));
  };
  
  const addNewDay = () => {
    if (days.length >= 7) return;
    const nextChar = String.fromCharCode(65 + days.length);
    const newDay = `Giorno ${nextChar}`;
    setDays([...days, newDay]);
    setActiveDay(newDay);
  };

  const saveAll = async () => {
    const missingName = exercises.find(ex => !ex.name || ex.name.trim() === '');
    if (missingName) {
        alert("Attenzione: Uno o più esercizi non hanno nome! Inseriscilo prima di salvare.");
        return;
    }

    setSaving(true);
    await supabase.from('exercises').delete().eq('program_id', id);

    const toSave = exercises.map(ex => ({
        program_id: id,
        name: ex.name,
        notes: ex.notes,
        day: ex.day || 'Giorno A',
        progression: ex.progression,
        sets: ex.progression['1']?.sets || '',
        reps: ex.progression['1']?.reps || '',
        weight: ex.progression['1']?.weight || '',
    }));

    if (toSave.length > 0) {
        const { error } = await supabase.from('exercises').insert(toSave);
        if (error) alert("Errore: " + error.message);
        else alert("Salvato! ✅");
    } else {
        alert("Scheda salvata (vuota).");
    }
    setSaving(false);
    loadData();
  };

  if (!program) return <div className="p-10 text-center">Caricamento...</div>;
  const weeks = Array.from({length: program.duration}, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans pb-40">
      {/* HEADER */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-6 sticky top-2 bg-white/90 backdrop-blur p-4 rounded-xl shadow-sm z-50 border border-slate-200">
          <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
              <div>
                  <h1 className="text-xl font-bold text-slate-800">{program.title}</h1>
                  <p className="text-xs text-slate-500 font-bold uppercase">{program.duration} SETTIMANE</p>
              </div>
          </div>
          <button onClick={saveAll} disabled={saving} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow hover:bg-black transition">
              <Save size={18}/> {saving ? "..." : "SALVA"}
          </button>
      </div>

      <div className="max-w-4xl mx-auto">
        
        {/* SELETTORE GIORNO */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 items-center">
            {days.map(day => (
                <div key={day} className="relative group">
                    <button 
                        onClick={() => setActiveDay(day)} 
                        className={`px-5 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 ${activeDay === day ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                    >
                        {day}
                        {activeDay === day && <Edit3 size={12} className="opacity-70" onClick={(e) => { e.stopPropagation(); renameDay(); }} />}
                    </button>
                </div>
            ))}
            {days.length < 7 && <button onClick={addNewDay} className="px-3 py-2 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:bg-white"><Plus size={16}/></button>}
        </div>

        {/* SELETTORE SETTIMANA */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase">Stai modificando:</span>
                <button onClick={copyCurrentWeekToAll} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
                    <Copy size={12}/> Copia W{viewWeek} su tutte le settimane
                </button>
            </div>
            <div className="flex gap-2 overflow-x-auto">
                {weeks.map(w => (
                    <button 
                        key={w} 
                        onClick={() => setViewWeek(w)}
                        className={`w-10 h-10 rounded-lg font-bold flex items-center justify-center border transition ${viewWeek === w ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                    >
                        {w}
                    </button>
                ))}
            </div>
        </div>

        {/* LISTA ESERCIZI */}
        <div className="space-y-4">
            {currentExercises.map((ex, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex gap-4 group">
                    <GripVertical className="text-slate-300 cursor-move mt-2"/>
                    
                    <div className="flex-1 space-y-4">
                        {/* Riga 1: Nome con Autocomplete */}
                        <div className="flex gap-3 relative">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Esercizio *</label>
                                <input 
                                    type="text" 
                                    list={`list-${idx}`} // Collega al datalist
                                    className={`w-full text-lg font-bold bg-transparent outline-none border-b ${!ex.name ? 'border-red-300 bg-red-50' : 'border-transparent'}`}
                                    placeholder="Es. Squat (Inizia a scrivere...)"
                                    value={ex.name}
                                    onChange={(e) => updateExerciseName(ex, e.target.value)}
                                />
                                {/* SUGGERIMENTI */}
                                <datalist id={`list-${idx}`}>
                                    {exerciseLibrary.map((name, i) => <option key={i} value={name} />)}
                                </datalist>
                            </div>
                            <button onClick={() => removeExercise(ex)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                        </div>

                        {/* Riga 2: Parametri */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-3 rounded-lg">
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Serie</label>
                                <input type="text" className="w-full font-bold bg-transparent outline-none" placeholder="3" 
                                    value={ex.progression?.[viewWeek]?.sets || ''} 
                                    onChange={(e) => updateProgression(ex, 'sets', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Reps</label>
                                <input type="text" className="w-full font-bold bg-transparent outline-none" placeholder="10" 
                                    value={ex.progression?.[viewWeek]?.reps || ''} 
                                    onChange={(e) => updateProgression(ex, 'reps', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Carico Target</label>
                                <input type="text" className="w-full font-bold bg-transparent outline-none" placeholder="facolt." 
                                    value={ex.progression?.[viewWeek]?.weight || ''} 
                                    onChange={(e) => updateProgression(ex, 'weight', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Recupero</label>
                                <input type="text" className="w-full font-bold text-blue-600 bg-transparent outline-none" placeholder='90"' 
                                    value={ex.progression?.[viewWeek]?.rest || ''} 
                                    onChange={(e) => updateProgression(ex, 'rest', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">RPE</label>
                                <input type="text" className="w-full font-bold text-orange-500 bg-transparent outline-none" placeholder="1-10" 
                                    value={ex.progression?.[viewWeek]?.rpe || ''} 
                                    onChange={(e) => updateProgression(ex, 'rpe', e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <input type="text" className="w-full text-xs text-slate-500 bg-transparent outline-none border-b border-transparent focus:border-slate-300" placeholder="Note tecniche..." value={ex.notes || ''} onChange={(e) => updateNotes(ex, e.target.value)}/>
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