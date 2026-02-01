"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Plus, Trash2, Copy, GripVertical, Info, FileText, Dumbbell, Edit2, Clock
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
  const [activeWeek, setActiveWeek] = useState(1);
  
  // NUOVO: Gestione Durata
  const [duration, setDuration] = useState(4);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [editingDayId, setEditingDayId] = useState(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    fetchProgram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (editingDayId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingDayId]);

  const fetchProgram = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("programs").select("*").eq("id", id).single();
    
    if (error || !data) {
      alert("Errore o scheda non trovata.");
      router.push("/admin/dashboard");
      return;
    }

    setProgram(data);
    setDuration(data.duration || 4); // Inizializza stato durata

    if (data.days_structure && Array.isArray(data.days_structure) && data.days_structure.length > 0) {
      const sanitizedDays = data.days_structure.map(d => ({
        ...d,
        exercises: Array.isArray(d.exercises) ? d.exercises : [],
        notes: d.notes || '' 
      }));
      setDays(sanitizedDays);
    } else {
      setDays([{ id: 'day-1', name: 'Giorno A', notes: '', exercises: [] }]);
    }
    setLoading(false);
  };

  // ... (LE ALTRE FUNZIONI INVARIATE: getExerciseDisplayData, getDayNotes, updateDayName...) ...
  // PER BREVITÀ QUI LE RIASSUMO, MA NEL FILE DEVI AVERLE TUTTE.
  // COPIA INCOLLA IL CODICE SOTTOSTANTE CHE È COMPLETO.

  const getExerciseDisplayData = (ex) => {
      if (activeWeek === 1) return ex;
      const override = ex.progression?.[activeWeek];
      return override ? { ...ex, ...override } : ex;
  };

  const getDayNotes = (day) => {
      if (activeWeek === 1) return day.notes || '';
      const p = day.progression || {};
      const wOverride = p[activeWeek] || p[String(activeWeek)];
      return wOverride?.notes ?? day.notes ?? '';
  };

  const updateDayName = (index, val) => {
    setDays(prevDays => prevDays.map((day, i) => 
        i === index ? { ...day, name: val } : day
    ));
  };

  const finishEditingDay = () => { setEditingDayId(null); };

  const updateDayNotes = (val) => {
    setDays(prevDays => prevDays.map((day, i) => {
        if (i !== activeDayIndex) return day;
        const updatedDay = { ...day };
        if (activeWeek === 1) updatedDay.notes = val;
        else {
            updatedDay.progression = { ...updatedDay.progression };
            if (!updatedDay.progression[activeWeek]) updatedDay.progression[activeWeek] = {};
            updatedDay.progression[activeWeek] = { ...updatedDay.progression[activeWeek], notes: val };
        }
        return updatedDay;
    }));
  };

  const updateExercise = (exIndex, field, value) => {
    setDays(prevDays => prevDays.map((day, dIdx) => {
        if (dIdx !== activeDayIndex) return day;
        const updatedExercises = day.exercises.map((ex, eIdx) => {
            if (eIdx !== exIndex) return ex;
            const updatedEx = { ...ex };
            if (activeWeek === 1) updatedEx[field] = value;
            else {
                updatedEx.progression = { ...updatedEx.progression };
                if (!updatedEx.progression[activeWeek]) updatedEx.progression[activeWeek] = { sets: updatedEx.sets, reps: updatedEx.reps, load: updatedEx.load, rest: updatedEx.rest, notes: updatedEx.notes };
                updatedEx.progression[activeWeek] = { ...updatedEx.progression[activeWeek], [field]: value };
            }
            return updatedEx;
        });
        return { ...day, exercises: updatedExercises };
    }));
  };

  const addDay = () => {
    const newDayLabel = String.fromCharCode(65 + days.length); 
    const newDay = { id: `day-${Date.now()}`, name: `Giorno ${newDayLabel}`, notes: '', exercises: [] };
    setDays([...days, newDay]);
    setActiveDayIndex(days.length); 
  };

  const deleteDay = () => {
    if (days.length <= 1) return alert("Devi avere almeno un giorno.");
    if (!confirm("Eliminare questo giorno?")) return;
    const newDays = days.filter((_, i) => i !== activeDayIndex);
    setDays(newDays);
    setActiveDayIndex(0);
  };

  const addExercise = () => {
    setDays(prevDays => prevDays.map((day, i) => {
        if (i !== activeDayIndex) return day;
        return { ...day, exercises: [...day.exercises, { id: `ex-${Date.now()}`, name: "", sets: "3", reps: "10", load: "", rest: "90\"", notes: "" }] };
    }));
  };

  const deleteExercise = (exIndex) => {
    setDays(prevDays => prevDays.map((day, i) => {
        if (i !== activeDayIndex) return day;
        return { ...day, exercises: day.exercises.filter((_, idx) => idx !== exIndex) };
    }));
  };

  const saveProgram = async () => {
    setSaving(true);
    // AGGIORNATO: Salva anche la durata!
    const { error } = await supabase.from("programs").update({ 
        days_structure: days, 
        duration: Number(duration), // SALVA DURATA
        updated_at: new Date() 
    }).eq("id", id);
    
    setSaving(false);
    if (error) alert("Errore: " + error.message);
    else alert("Salvato!");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Caricamento...</div>;
  
  const activeDay = days[activeDayIndex];
  if (!activeDay) return <div className="p-10 text-center">Inizializzazione...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition"><ArrowLeft size={22}/></button>
                <div>
                    <h1 className="text-xl font-black text-slate-900">{program?.title || "Scheda"}</h1>
                    {/* INPUT DURATA MODIFICABILE */}
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        <Clock size={12}/>
                        <input 
                            type="number" 
                            value={duration} 
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-8 bg-transparent text-center border-b border-slate-300 focus:border-blue-500 outline-none text-slate-600 font-bold"
                        />
                        SETTIMANE
                    </div>
                </div>
            </div>
            <button onClick={saveProgram} disabled={saving} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition shadow-lg disabled:opacity-50"><Save size={18}/> {saving ? "..." : "SALVA"}</button>
        </div>

        {/* SETTIMANE TOGGLE (Generato dinamicamente in base alla durata!) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {Array.from({ length: Number(duration) || 4 }).map((_, i) => {
                const w = i + 1;
                return (
                    <button key={w} onClick={() => setActiveWeek(w)} className={`flex-shrink-0 w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center transition border ${activeWeek === w ? "bg-slate-900 text-white border-slate-900 shadow-md scale-105" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>W{w}</button>
                );
            })}
        </div>
      </div>

      {/* ... (IL RESTO DEL BODY È IDENTICO ALL'ULTIMA VERSIONE FUNZIONANTE) ... */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {days.map((day, idx) => {
            const isActive = idx === activeDayIndex;
            const isEditing = editingDayId === day.id;
            return (
                <div 
                    key={day.id}
                    className={`relative flex items-center px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${isActive ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
                    onClick={() => !isEditing && setActiveDayIndex(idx)}
                >
                    {isEditing ? (
                        <input
                            ref={editInputRef}
                            value={day.name}
                            onChange={(e) => updateDayName(idx, e.target.value)}
                            onBlur={finishEditingDay}
                            onKeyDown={(e) => e.key === "Enter" && finishEditingDay()}
                            className="bg-transparent text-sm font-bold outline-none text-white w-24"
                        />
                    ) : (
                        <span className="font-bold text-sm whitespace-nowrap">{day.name}</span>
                    )}
                    {isActive && !isEditing && (<button onClick={(e) => { e.stopPropagation(); setEditingDayId(day.id); }} className="ml-2 p-1 text-blue-200 hover:text-white rounded-full hover:bg-blue-500/50 transition"><Edit2 size={12}/></button>)}
                </div>
            );
          })}
          <button onClick={addDay} className="p-2.5 bg-slate-200 rounded-xl hover:bg-slate-300 text-slate-600 transition"><Plus size={18}/></button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{activeWeek === 1 ? "Programma Base (W1)" : `Modifica Settimana ${activeWeek}`}</div>
                <div className="flex items-center gap-2"><button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1 hover:bg-blue-100 transition"><Copy size={14}/> Copia W1 su tutte</button><button onClick={deleteDay} className="text-slate-400 hover:text-red-500 p-2 transition"><Trash2 size={18}/></button></div>
            </div>
            <div className="px-5 pt-5 relative">
                {activeWeek > 1 && (<div className="absolute top-5 right-5 text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 z-10">NOTA W{activeWeek}</div>)}
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-3">
                    <div className="mt-1 text-amber-400"><Info size={18}/></div>
                    <div className="flex-1"><label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Note per la giornata</label><textarea value={getDayNotes(activeDay)} onChange={(e) => updateDayNotes(e.target.value)} placeholder="Es. Focus tempo sotto tensione..." className="w-full bg-transparent outline-none text-sm text-amber-900 placeholder:text-amber-400/70 font-medium resize-none h-auto min-h-[40px]" rows={2}/></div>
                </div>
            </div>
            <div className="p-5 space-y-4">
                {(!activeDay.exercises || activeDay.exercises.length === 0) ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl text-slate-400"><Dumbbell size={32} className="mx-auto mb-2 opacity-20"/><p className="text-sm font-medium">Nessun esercizio.</p></div>
                ) : (
                    activeDay.exercises.map((ex, idx) => {
                        const data = getExerciseDisplayData(ex);
                        return (
                            <div key={ex.id || idx} className={`group relative bg-white border rounded-2xl p-4 shadow-sm hover:border-blue-400 transition-all ${activeWeek > 1 ? "border-blue-100 bg-blue-50/20" : "border-slate-200"}`}>
                                {activeWeek > 1 && (<div className="absolute top-2 right-2 text-[9px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded">MODIFICA W{activeWeek}</div>)}
                                <div className="flex items-start gap-3 mb-4">
                                    <button className="mt-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"><GripVertical size={20}/></button>
                                    <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Esercizio</label><input value={data.name} onChange={(e) => updateExercise(idx, 'name', e.target.value)} className="w-full text-lg font-bold text-slate-900 outline-none placeholder:text-slate-300" placeholder="Nome Esercizio"/></div>
                                    <button onClick={() => deleteExercise(idx)} className="text-slate-200 hover:text-red-500 transition"><Trash2 size={18}/></button>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100"><label className="block text-[9px] font-bold text-slate-400 uppercase text-center mb-1">Serie</label><input value={data.sets} onChange={(e) => updateExercise(idx, 'sets', e.target.value)} className="w-full text-center font-bold text-slate-700 bg-transparent outline-none" /></div>
                                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100"><label className="block text-[9px] font-bold text-slate-400 uppercase text-center mb-1">Reps</label><input value={data.reps} onChange={(e) => updateExercise(idx, 'reps', e.target.value)} className="w-full text-center font-bold text-slate-700 bg-transparent outline-none" /></div>
                                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100"><label className="block text-[9px] font-bold text-slate-400 uppercase text-center mb-1">Recupero</label><input value={data.rest} onChange={(e) => updateExercise(idx, 'rest', e.target.value)} className="w-full text-center font-bold text-slate-700 bg-transparent outline-none" /></div>
                                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100"><label className="block text-[9px] font-bold text-slate-400 uppercase text-center mb-1">Carico</label><input value={data.load} onChange={(e) => updateExercise(idx, 'load', e.target.value)} placeholder="-" className="w-full text-center font-bold text-slate-700 bg-transparent outline-none placeholder:text-slate-300" /></div>
                                </div>
                                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2"><FileText size={16} className="text-yellow-600"/><input value={data.notes || ''} onChange={(e) => updateExercise(idx, 'notes', e.target.value)} placeholder="Note tecniche..." className="w-full bg-transparent text-sm font-medium text-yellow-800 placeholder:text-yellow-800/50 outline-none"/></div>
                            </div>
                        );
                    })
                )}
                <button onClick={addExercise} className="w-full py-4 rounded-xl border-2 border-dashed border-blue-200 text-blue-600 font-bold flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition"><Plus size={20}/> Aggiungi esercizio</button>
            </div>
        </div>
      </div>
    </div>
  );
}