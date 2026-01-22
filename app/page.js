"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, PlusCircle, Save, X, ChevronRight, LayoutList, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomeCreator() {
  const router = useRouter();
  
  // STATI DEL WIZARD
  const [step, setStep] = useState(1); // 1 = Setup, 2 = Inserimento Esercizi
  const [uploading, setUploading] = useState(false);

  // DATI SCHEDA
  const [schedaName, setSchedaName] = useState('');
  const [totalDays, setTotalDays] = useState(null); // PARTIAMO DA NULL (Obbliga la scelta)
  const [currentDayEditing, setCurrentDayEditing] = useState(1);
  
  // DATABASE LOCALE ESERCIZI
  const [exercisesByDay, setExercisesByDay] = useState({});

  // INPUT CORRENTE
  const [currentEx, setCurrentEx] = useState({ name: '', serie: '', reps: '', rec: '', video: '' });

  // --- LOGICA STEP 1: SETUP ---
  const handleStart = () => {
    if (!schedaName) { alert("Dai un nome alla scheda!"); return; }
    if (!totalDays) { alert("Seleziona quanti giorni dura la scheda!"); return; }
    setStep(2);
  };

  // --- LOGICA STEP 2: AGGIUNTA ESERCIZI ---
  const addExercise = () => {
    if (!currentEx.name || !currentEx.serie || !currentEx.reps) {
      alert("Compila nome, serie e reps"); return;
    }

    const newEx = { ...currentEx };
    
    setExercisesByDay(prev => ({
      ...prev,
      [currentDayEditing]: [...(prev[currentDayEditing] || []), newEx]
    }));

    // Pulisce input
    setCurrentEx({ name: '', serie: '', reps: '', rec: '', video: '' });
  };

  const removeExercise = (day, index) => {
    setExercisesByDay(prev => {
      const newList = [...prev[day]];
      newList.splice(index, 1);
      return { ...prev, [day]: newList };
    });
  };

  // --- NAVIGAZIONE GIORNI ---
  const nextDay = () => {
    if (currentDayEditing < totalDays) {
      setCurrentDayEditing(prev => prev + 1);
    }
  };

  // --- SALVATAGGIO FINALE ---
  const saveAll = async () => {
    const hasExercises = Object.keys(exercisesByDay).length > 0;
    if (!hasExercises) { alert("La scheda è vuota!"); return; }

    setUploading(true);

    let flatContent = [];
    
    for (let d = 1; d <= totalDays; d++) {
      const dayExercises = exercisesByDay[d] || [];
      dayExercises.forEach(ex => {
        flatContent.push({
          Esercizio: `GIORNO ${d} - ${ex.name}`,
          Serie: ex.serie,
          Reps: ex.reps,
          Recupero: ex.rec || '60s',
          Video: ex.video
        });
      });
    }

    const { error } = await supabase
      .from('workout_templates')
      .insert([{ title: schedaName, content: flatContent }]);

    if (error) {
      alert("Errore: " + error.message);
      setUploading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 flex flex-col items-center justify-center">
      
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-all">
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold">{step === 1 ? 'Nuova Scheda' : schedaName}</h1>
              <p className="opacity-80 text-xs uppercase font-bold tracking-wider">Passo {step} di 2</p>
            </div>
          </div>
          <Link href="/dashboard" className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest border border-white/20">
            Archivio
          </Link>
        </div>

        {/* --- STEP 1: SETUP --- */}
        {step === 1 && (
          <div className="p-8 space-y-8 animate-fade-in">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome Atleta / Scheda</label>
              <input 
                autoFocus
                type="text" 
                placeholder="Es. Marco - Ipertrofia" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-lg font-bold outline-none focus:border-blue-500 transition-all text-slate-800"
                value={schedaName}
                onChange={e => setSchedaName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Giorni di Allenamento (Split)</label>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => setTotalDays(num)}
                    className={`aspect-square rounded-xl font-bold text-xl transition-all border-2 flex items-center justify-center ${
                      totalDays === num 
                        ? 'border-blue-500 bg-blue-600 text-white shadow-lg scale-105' 
                        : 'border-slate-100 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleStart}
              disabled={!schedaName || !totalDays}
              className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 mt-4 text-lg
                ${(!schedaName || !totalDays) 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
            >
              INIZIA CREAZIONE <ChevronRight />
            </button>
          </div>
        )}

        {/* --- STEP 2: RIEMPIMENTO --- */}
        {step === 2 && (
          <div className="animate-fade-in">
            
            {/* Navigazione Giorni (Tab in alto) */}
            <div className="flex overflow-x-auto bg-slate-50 p-2 gap-2 border-b border-slate-100 scrollbar-hide">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(dayNum => (
                <button
                  key={dayNum}
                  onClick={() => setCurrentDayEditing(dayNum)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                    currentDayEditing === dayNum
                      ? 'bg-white text-blue-600 shadow-md border border-slate-100 ring-2 ring-blue-50'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Giorno {dayNum}
                </button>
              ))}
            </div>

            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <LayoutList className="text-blue-500" size={20} />
                <span className="uppercase">Modifica Giorno {currentDayEditing}</span>
              </h2>

              {/* INPUT ESERCIZIO - Layout GRIGLIA (Risolve il problema Reps) */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-6 space-y-3 shadow-sm">
                
                {/* Riga 1: Nome (50%), Serie (25%), Reps (25%) */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-blue-400 uppercase pl-1 mb-1 block">Esercizio</label>
                    <input 
                      className="w-full p-3 rounded-xl border border-blue-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                      placeholder="Es. Panca"
                      value={currentEx.name}
                      onChange={e => setCurrentEx({...currentEx, name: e.target.value})}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-blue-400 uppercase pl-1 mb-1 block text-center">Serie</label>
                    <input 
                      className="w-full p-3 rounded-xl border border-blue-200 text-sm text-center font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                      placeholder="3"
                      inputMode="numeric"
                      value={currentEx.serie}
                      onChange={e => setCurrentEx({...currentEx, serie: e.target.value})}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-blue-400 uppercase pl-1 mb-1 block text-center">Reps</label>
                    <input 
                      className="w-full p-3 rounded-xl border border-blue-200 text-sm text-center font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                      placeholder="10"
                      value={currentEx.reps}
                      onChange={e => setCurrentEx({...currentEx, reps: e.target.value})}
                    />
                  </div>
                </div>

                {/* Riga 2: Rec e Video */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <input 
                      className="w-full p-3 rounded-xl border border-blue-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      placeholder="Rec (90s)"
                      value={currentEx.rec}
                      onChange={e => setCurrentEx({...currentEx, rec: e.target.value})}
                    />
                  </div>
                   <div className="col-span-2">
                    <input 
                      className="w-full p-3 rounded-xl border border-blue-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Link Video YouTube (Opzionale)"
                      value={currentEx.video}
                      onChange={e => setCurrentEx({...currentEx, video: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  onClick={addExercise}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <PlusCircle size={18} /> AGGIUNGI A GIORNO {currentDayEditing}
                </button>
              </div>

              {/* LISTA ESERCIZI DEL GIORNO CORRENTE */}
              <div className="space-y-2 mb-8 min-h-[150px]">
                {(!exercisesByDay[currentDayEditing] || exercisesByDay[currentDayEditing].length === 0) && (
                  <div className="text-center py-8 opacity-50 border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-slate-400 text-sm font-bold">Giorno {currentDayEditing} vuoto</p>
                    <p className="text-xs text-slate-300">Aggiungi esercizi sopra</p>
                  </div>
                )}
                
                {exercisesByDay[currentDayEditing]?.map((ex, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-sm animate-fade-in-up hover:border-blue-300 transition-colors">
                    <div>
                      <span className="font-bold text-slate-800 block text-base">{ex.name}</span>
                      <div className="flex gap-3 text-xs text-slate-500 mt-1 font-mono uppercase bg-slate-50 inline-block px-2 py-1 rounded-md">
                        <span><b className="text-slate-700">{ex.serie}</b> Serie</span>
                        <span><b className="text-slate-700">{ex.reps}</b> Reps</span>
                        <span>Rec: {ex.rec || '60s'}</span>
                      </div>
                    </div>
                    <button onClick={() => removeExercise(currentDayEditing, i)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all">
                      <X size={20} />
                    </button>
                  </div>
                ))}
              </div>

              {/* FOOTER ACTIONS */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white pb-2">
                {currentDayEditing < totalDays ? (
                  <button 
                    onClick={nextDay}
                    className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-all flex justify-center items-center gap-2"
                  >
                    COMPILA GIORNO {currentDayEditing + 1} <ChevronRight />
                  </button>
                ) : (
                  <button 
                    onClick={saveAll}
                    disabled={uploading}
                    className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition-all flex justify-center items-center gap-2 animate-pulse-slow"
                  >
                    {uploading ? <Loader2 className="animate-spin" /> : <><CheckCircle /> SALVA SCHEDA</>}
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}