"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Plus, Trash2, Copy, GripVertical, Settings, Info, FileText, Dumbbell
} from "lucide-react";

export default function EditorPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [program, setProgram] = useState(null);
  const [days, setDays] = useState([]); 
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- INIT ---
  useEffect(() => {
    fetchProgram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProgram = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("programs").select("*").eq("id", id).single();
    
    if (error || !data) {
      // Se c'è un errore, non crashare, torna alla dashboard
      alert("Errore o scheda non trovata.");
      router.push("/admin/dashboard");
      return;
    }

    setProgram(data);

    // LOGICA ROBUSTA: Se days_structure esiste nel DB usalo, altrimenti crea default
    if (data.days_structure && Array.isArray(data.days_structure) && data.days_structure.length > 0) {
      // Sanifica i dati esistenti (se mancano campi come notes, li aggiunge)
      const sanitizedDays = data.days_structure.map(d => ({
        ...d,
        exercises: Array.isArray(d.exercises) ? d.exercises : [],
        notes: d.notes || '' 
      }));
      setDays(sanitizedDays);
    } else {
      // Nuova scheda: crea Giorno A vuoto
      setDays([{ id: 'day-1', name: 'Giorno A', notes: '', exercises: [] }]);
    }
    setLoading(false);
  };

  // --- AZIONI ---
  const addDay = () => {
    const newDayLabel = String.fromCharCode(65 + days.length); 
    const newDay = { 
      id: `day-${Date.now()}`, 
      name: `Giorno ${newDayLabel}`, 
      notes: '', 
      exercises: [] 
    };
    setDays([...days, newDay]);
    setActiveDayIndex(days.length); 
  };

  const updateDayName = (val) => {
    const newDays = [...days];
    if(newDays[activeDayIndex]) {
        newDays[activeDayIndex].name = val;
        setDays(newDays);
    }
  };

  const updateDayNotes = (val) => {
    const newDays = [...days];
    if(newDays[activeDayIndex]) {
        newDays[activeDayIndex].notes = val;
        setDays(newDays);
    }
  };

  const deleteDay = () => {
    if (days.length <= 1) return alert("Devi avere almeno un giorno.");
    if (!confirm("Eliminare questo giorno e tutti i suoi esercizi?")) return;
    const newDays = days.filter((_, i) => i !== activeDayIndex);
    setDays(newDays);
    setActiveDayIndex(0);
  };

  const addExercise = () => {
    const newDays = [...days];
    if(newDays[activeDayIndex]) {
        newDays[activeDayIndex].exercises.push({
        id: `ex-${Date.now()}`,
        name: "Nuovo Esercizio",
        sets: "3",
        reps: "10",
        load: "",
        rest: "90\"",
        notes: ""
        });
        setDays(newDays);
    }
  };

  const updateExercise = (exIndex, field, value) => {
    const newDays = [...days];
    if(newDays[activeDayIndex] && newDays[activeDayIndex].exercises[exIndex]) {
        newDays[activeDayIndex].exercises[exIndex][field] = value;
        setDays(newDays);
    }
  };

  const deleteExercise = (exIndex) => {
    const newDays = [...days];
    if(newDays[activeDayIndex]) {
        newDays[activeDayIndex].exercises.splice(exIndex, 1);
        setDays(newDays);
    }
  };

  const saveProgram = async () => {
    setSaving(true);
    // Ora che hai aggiunto la colonna days_structure nel DB, questo funzionerà
    const { error } = await supabase
      .from("programs")
      .update({ 
        days_structure: days,
        updated_at: new Date()
      })
      .eq("id", id);

    setSaving(false);
    if (error) alert("Errore salvataggio: " + error.message);
    else alert("Scheda salvata!");
  };

  // --- RENDER SAFEGUARDS ---
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Caricamento editor...</div>;
  
  // Protezione contro crash se l'array days è vuoto
  const activeDay = days[activeDayIndex];
  if (!activeDay) return <div className="p-10 text-center">Inizializzazione dati...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
            <ArrowLeft size={22}/>
          </button>
          <div>
            <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">{program?.title || "Scheda"}</h1>
                <button className="text-slate-400 hover:text-blue-600"><Settings size={14}/></button>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{program?.duration} SETTIMANE</p>
          </div>
        </div>
        <button 
          onClick={saveProgram} 
          disabled={saving}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition shadow-lg disabled:opacity-50"
        >
          <Save size={18}/> {saving ? "Salvataggio..." : "SALVA"}
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* DAY TABS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {days.map((day, idx) => (
            <button
              key={day.id}
              onClick={() => setActiveDayIndex(idx)}
              className={`px-5 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition border ${
                idx === activeDayIndex 
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              {day.name}
            </button>
          ))}
          <button onClick={addDay} className="p-2 bg-slate-200 rounded-xl hover:bg-slate-300 text-slate-600 transition">
            <Plus size={18}/>
          </button>
        </div>

        {/* CARD GIORNO ATTIVO */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* HEADER GIORNO */}
            <div className="bg-slate-50 border-b border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400">
                        {String.fromCharCode(65 + activeDayIndex)}
                    </div>
                    <input 
                        value={activeDay.name} 
                        onChange={(e) => updateDayName(e.target.value)}
                        className="bg-transparent font-black text-xl text-slate-800 outline-none w-full placeholder:text-slate-300"
                        placeholder="Nome Giorno (es. Gambe)"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1 hover:bg-blue-100 transition">
                        <Copy size={14}/> Copia W1 su tutte
                    </button>
                    <button onClick={deleteDay} className="text-slate-400 hover:text-red-500 p-2 transition">
                        <Trash2 size={18}/>
                    </button>
                </div>
            </div>

            {/* SEZIONE NOTE GIORNATA */}
            <div className="px-5 pt-5">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-3">
                    <div className="mt-1 text-amber-400"><Info size={18}/></div>
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Note per la giornata</label>
                        <textarea 
                            value={activeDay.notes || ''}
                            onChange={(e) => updateDayNotes(e.target.value)}
                            placeholder="Es. Focus tempo sotto tensione, recuperi rigidi..."
                            className="w-full bg-transparent outline-none text-sm text-amber-900 placeholder:text-amber-400/70 font-medium resize-none h-auto min-h-[40px]"
                            rows={2}
                        />
                    </div>
                </div>
            </div>

            {/* LISTA ESERCIZI */}
            <div className="p-5 space-y-4">
                {(!activeDay.exercises || activeDay.exercises.length === 0) ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl text-slate-400">
                        <Dumbbell size={32} className="mx-auto mb-2 opacity-20"/>
                        <p className="text-sm font-medium">Nessun esercizio.</p>
                        <p className="text-xs">Clicca "Aggiungi esercizio" qui sotto.</p>
                    </div>
                ) : (
                    activeDay.exercises.map((ex, idx) => (
                        <div key={ex.id || idx} className="group relative bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition-all">
                            
                            {/* Header Esercizio */}
                            <div className="flex items-start gap-3 mb-4">
                                <button className="mt-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"><GripVertical size={20}/></button>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Esercizio</label>
                                    <input 
                                        value={ex.name} 
                                        onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                                        className="w-full text-lg font-bold text-slate-900 outline-none placeholder:text-slate-300"
                                        placeholder="Nome Esercizio"
                                    />
                                </div>
                                <button onClick={() => deleteExercise(idx)} className="text-slate-200 hover:text-red-500 transition"><Trash2 size={18}/></button>
                            </div>

                            {/* Griglia Parametri */}
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase text-center mb-1">Serie</label>
                                    <input value={ex.sets} onChange={(e) => updateExercise(idx, 'sets', e.target.value)} className="w-full text-center font-bold text-slate-700 bg-transparent outline-none" />
                                </div>
                                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase text-center mb-1">Reps</label>
                                    <input value={ex.reps} onChange={(e) => updateExercise(idx, 'reps', e.target.value)} className="w-full text-center font-bold text-slate-700 bg-transparent outline-none" />
                                </div>
                                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase text-center mb-1">Recupero</label>
                                    <input value={ex.rest} onChange={(e) => updateExercise(idx, 'rest', e.target.value)} className="w-full text-center font-bold text-slate-700 bg-transparent outline-none" />
                                </div>
                                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase text-center mb-1">Carico</label>
                                    <input value={ex.load} onChange={(e) => updateExercise(idx, 'load', e.target.value)} placeholder="-" className="w-full text-center font-bold text-slate-700 bg-transparent outline-none placeholder:text-slate-300" />
                                </div>
                            </div>

                            {/* NOTE TECNICHE VISIBILI */}
                            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2">
                                <FileText size={16} className="text-yellow-600"/>
                                <input 
                                    value={ex.notes || ''} 
                                    onChange={(e) => updateExercise(idx, 'notes', e.target.value)}
                                    placeholder="Note tecniche (es. gomiti stretti, ecc...)"
                                    className="w-full bg-transparent text-sm font-medium text-yellow-800 placeholder:text-yellow-800/50 outline-none"
                                />
                            </div>

                        </div>
                    ))
                )}

                <button 
                    onClick={addExercise}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 font-bold flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition"
                >
                    <Plus size={20}/> Aggiungi esercizio
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}