"use client";
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';
import { 
  UploadCloud, FileSpreadsheet, Loader2, ArrowRight, Eye, 
  Trash2, Plus, Save, X, Edit, LayoutList, Calendar, StickyNote 
} from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  // --- STATI DI NAVIGAZIONE ---
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'editor'
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);
  const [savedWorkouts, setSavedWorkouts] = useState([]);

  // --- STATI DELL'EDITOR ---
  const [editingId, setEditingId] = useState(null); // Se null = Nuova Scheda, se ID = Modifica
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('setup'); // 'setup' | 'builder'
  
  // Dati Scheda
  const [schedaName, setSchedaName] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [daysStructure, setDaysStructure] = useState(['Giorno A']); // Es. ['Giorno A', 'Giorno B']
  
  // Dati Esercizi e Note Giornaliere
  const [manualExercises, setManualExercises] = useState([]); 
  const [dayNotes, setDayNotes] = useState({}); // { "Giorno A": "Focus Gambe", "Giorno B": "..." }

  // Input temporaneo per nuovo esercizio
  const [currentEx, setCurrentEx] = useState({
    day: '', 
    name: '',
    serie: '',
    reps: '',
    rec: '',
    video: '',
    note: '' 
  });

  // --- CARICAMENTO INIZIALE ---
  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setSavedWorkouts(data);
    setLoadingWorkouts(false);
  };

  // --- GESTIONE SETUP (Step 1) ---
  const handleDaysChange = (num) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const newStructure = Array.from({ length: num }, (_, i) => `Giorno ${letters[i]}`);
    setDaysStructure(newStructure);
    // Se riduciamo i giorni, potremmo dover pulire esercizi orfani, ma per ora teniamoli
  };

  const startCreating = () => {
    if (!schedaName) { alert("Dai un nome alla scheda!"); return; }
    setActiveTab('builder');
    // Imposta il primo giorno come default per l'inserimento
    setCurrentEx(prev => ({ ...prev, day: daysStructure[0] }));
  };

  // --- GESTIONE BUILDER (Step 2) ---
  const addExercise = () => {
    if (!currentEx.name || !currentEx.serie || !currentEx.reps) {
      alert("Inserisci almeno Nome, Serie e Reps.");
      return;
    }
    
    // Creiamo l'esercizio
    const newExercise = {
      Esercizio: `${currentEx.day.toUpperCase()} - ${currentEx.name}`, // Formato compatibile
      Serie: currentEx.serie,
      Reps: currentEx.reps,
      Recupero: currentEx.rec || '60s',
      Video: currentEx.video,
      Note: currentEx.note,
      DayTag: currentEx.day // Ci serve per filtrare nell'editor
    };

    setManualExercises([...manualExercises, newExercise]);
    setCurrentEx({ ...currentEx, name: '', serie: '', reps: '', rec: '', video: '', note: '' });
  };

  const removeExercise = (index) => {
    const newList = [...manualExercises];
    newList.splice(index, 1);
    setManualExercises(newList);
  };

  // --- SALVATAGGIO (Create & Update) ---
  const handleSave = async () => {
    if (manualExercises.length === 0) { alert("Aggiungi almeno un esercizio!"); return; }
    setUploading(true);

    // 1. Incorporiamo le "Note del Giorno" dentro il content come oggetti speciali
    // Così non dobbiamo cambiare il database
    const finalContent = [...manualExercises];
    
    Object.keys(dayNotes).forEach(day => {
      if (dayNotes[day] && dayNotes[day].trim() !== "") {
        finalContent.unshift({
          type: 'day_note',
          day: day,
          text: dayNotes[day]
        });
      }
    });

    const payload = { 
      title: schedaName, 
      coach_notes: coachNotes, 
      content: finalContent 
    };

    let error;
    if (editingId) {
      // UPDATE
      const { error: err } = await supabase
        .from('workout_templates')
        .update(payload)
        .eq('id', editingId);
      error = err;
    } else {
      // INSERT
      const { error: err } = await supabase
        .from('workout_templates')
        .insert([payload]);
      error = err;
    }

    if (error) {
      alert("Errore: " + error.message);
    } else {
      alert(editingId ? "Scheda aggiornata!" : "Scheda creata!");
      resetEditor();
      fetchWorkouts();
      setView('dashboard');
    }
    setUploading(false);
  };

  // --- GESTIONE CARICAMENTO PER MODIFICA ---
  const loadForEdit = (workout) => {
    setEditingId(workout.id);
    setSchedaName(workout.title);
    setCoachNotes(workout.coach_notes || '');
    
    // Ricostruiamo la struttura dai dati salvati
    let extractedExercises = [];
    let extractedDayNotes = {};
    let foundDays = new Set();

    if (Array.isArray(workout.content)) {
      workout.content.forEach(item => {
        if (item.type === 'day_note') {
          // È una nota giorno
          extractedDayNotes[item.day] = item.text;
          foundDays.add(item.day);
        } else {
          // È un esercizio
          // Cerchiamo di capire il giorno dal nome (es. "GIORNO A - Squat")
          let day = "Extra";
          let pureName = item.Esercizio;
          if (item.Esercizio.includes(" - ")) {
            const parts = item.Esercizio.split(" - ");
            day = parts[0].trim(); // "GIORNO A"
            // Convertiamo in Title Case se necessario (es Giorno A)
            day = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase(); 
            pureName = parts.slice(1).join(" - ");
          }
          foundDays.add(day);
          extractedExercises.push({
            ...item,
            name: pureName, // Solo per visualizzazione editor
            DayTag: day     // Fondamentale per l'editor
          });
        }
      });
    }

    // Ordiniamo i giorni trovati
    const sortedDays = Array.from(foundDays).sort();
    if (sortedDays.length > 0) setDaysStructure(sortedDays);

    setManualExercises(extractedExercises);
    setDayNotes(extractedDayNotes);
    
    setView('editor');
    setActiveTab('builder');
    if (sortedDays.length > 0) setCurrentEx(prev => ({...prev, day: sortedDays[0]}));
  };

  const resetEditor = () => {
    setEditingId(null);
    setSchedaName('');
    setCoachNotes('');
    setDaysStructure(['Giorno A']);
    setManualExercises([]);
    setDayNotes({});
    setActiveTab('setup');
  };

  const deleteWorkout = async (id) => {
    if (!confirm("Eliminare definitivamente?")) return;
    await supabase.from('workout_logs').delete().eq('assignment_id', id);
    await supabase.from('workout_templates').delete().eq('id', id);
    setSavedWorkouts(prev => prev.filter(w => w.id !== id));
  };

  // --- RENDER VISTE ---

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans p-8">
        <div className="max-w-5xl mx-auto">
          {/* HEADER DASHBOARD */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Le Tue Schede</h1>
              <p className="text-slate-400">Archivio Completo</p>
            </div>
            <button 
              onClick={() => { resetEditor(); setView('editor'); }}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Plus size={20} /> Nuova Scheda
            </button>
          </div>

          {/* LISTA SCHEDE */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedWorkouts.map((workout) => (
              <div key={workout.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative">
                <div className="absolute top-4 right-4 flex gap-2">
                   <button onClick={() => loadForEdit(workout)} className="text-slate-300 hover:text-blue-500 p-1" title="Modifica">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => deleteWorkout(workout.id)} className="text-slate-300 hover:text-red-500 p-1" title="Elimina">
                    <Trash2 size={18} />
                  </button>
                </div>

                <h3 className="font-bold text-lg text-slate-800 mb-1">{workout.title}</h3>
                <p className="text-xs text-slate-400 mb-6">Modificata il {new Date(workout.created_at).toLocaleDateString()}</p>

                <div className="flex gap-2">
                  <Link href={`/report/${workout.id}`} className="flex-1 bg-purple-50 text-purple-600 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-100 border border-purple-100">
                    <Eye size={14} /> Report
                  </Link>
                  <Link href={`/scheda/${workout.id}`} className="flex-1 bg-blue-50 text-blue-600 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 border border-blue-100">
                    <ArrowRight size={14} /> Link
                  </Link>
                </div>
              </div>
            ))}
            {savedWorkouts.length === 0 && <p className="text-slate-400">Nessuna scheda creata.</p>}
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA EDITOR ---
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* HEADER EDITOR */}
      <div className="border-b border-slate-100 p-4 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
        <button onClick={() => setView('dashboard')} className="text-slate-400 hover:text-slate-800 font-bold flex items-center gap-2 text-sm">
          <ArrowRight className="rotate-180" size={16}/> Torna alla Lista
        </button>
        <span className="font-bold text-slate-800">{editingId ? "Modifica Scheda" : "Crea Nuova Scheda"}</span>
        <button onClick={handleSave} disabled={uploading} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-black">
          {uploading ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Salva Tutto</>}
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        
        {/* TABS EDITOR */}
        <div className="flex gap-8 mb-8 border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('setup')}
            className={`pb-4 text-sm font-bold transition-colors ${activeTab === 'setup' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
          >
            1. Setup & Note Generali
          </button>
          <button 
            onClick={startCreating}
            className={`pb-4 text-sm font-bold transition-colors ${activeTab === 'builder' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
          >
            2. Costruttore Esercizi
          </button>
        </div>

        {/* STEP 1: SETUP */}
        {activeTab === 'setup' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome Scheda / Atleta</label>
              <input 
                type="text" value={schedaName} onChange={e => setSchedaName(e.target.value)}
                className="w-full text-2xl font-bold border-b border-slate-200 py-2 focus:border-blue-600 outline-none placeholder:text-slate-200"
                placeholder="Es. Marco - Ipertrofia"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Struttura Giorni (Split)</label>
              <div className="flex gap-2 mb-2">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button 
                    key={num} 
                    onClick={() => handleDaysChange(num)}
                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${daysStructure.length === num ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">Attuale: {daysStructure.join(", ")}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Note Generali Scheda</label>
              <textarea 
                value={coachNotes} onChange={e => setCoachNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm h-32 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Obiettivi generali, raccomandazioni..."
              />
            </div>

            <button onClick={startCreating} className="w-full bg-blue-50 text-blue-600 font-bold py-4 rounded-xl hover:bg-blue-100 transition-colors">
              Prosegui agli Esercizi <ArrowRight className="inline ml-2" size={16}/>
            </button>
          </div>
        )}

        {/* STEP 2: BUILDER */}
        {activeTab === 'builder' && (
          <div className="animate-fade-in">
            
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              
              {/* COLONNA SX: INPUT */}
              <div className="lg:col-span-1 bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl p-6 sticky top-24">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-500"/> Aggiungi</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Seleziona Giorno</label>
                    <select 
                      value={currentEx.day} 
                      onChange={e => setCurrentEx({...currentEx, day: e.target.value})}
                      className="w-full p-3 bg-slate-50 rounded-xl border-r-[10px] border-transparent outline-none font-bold text-slate-700 cursor-pointer"
                    >
                      {daysStructure.map(day => <option key={day} value={day}>{day}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Esercizio</label>
                    <input type="text" value={currentEx.name} onChange={e => setCurrentEx({...currentEx, name: e.target.value})} className="w-full p-2 border-b border-slate-200 outline-none text-sm font-bold" placeholder="Es. Panca Piana"/>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[10px] text-slate-400 uppercase">Serie</label><input type="text" value={currentEx.serie} onChange={e => setCurrentEx({...currentEx, serie: e.target.value})} className="w-full p-2 border-b border-slate-200 outline-none text-sm text-center" placeholder="4"/></div>
                    <div><label className="text-[10px] text-slate-400 uppercase">Reps</label><input type="text" value={currentEx.reps} onChange={e => setCurrentEx({...currentEx, reps: e.target.value})} className="w-full p-2 border-b border-slate-200 outline-none text-sm text-center" placeholder="10"/></div>
                    <div><label className="text-[10px] text-slate-400 uppercase">Rec</label><input type="text" value={currentEx.rec} onChange={e => setCurrentEx({...currentEx, rec: e.target.value})} className="w-full p-2 border-b border-slate-200 outline-none text-sm text-center" placeholder="60s"/></div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Note Esercizio</label>
                    <input type="text" value={currentEx.note} onChange={e => setCurrentEx({...currentEx, note: e.target.value})} className="w-full p-2 border-b border-slate-200 outline-none text-sm text-slate-500" placeholder="Es. Fermo 2s"/>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Link Video</label>
                    <input type="text" value={currentEx.video} onChange={e => setCurrentEx({...currentEx, video: e.target.value})} className="w-full p-2 border-b border-slate-200 outline-none text-sm text-blue-500" placeholder="https://..."/>
                  </div>

                  <button onClick={addExercise} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors">Inserisci</button>
                </div>
              </div>

              {/* COLONNA DX: ANTEPRIMA */}
              <div className="lg:col-span-2 space-y-8">
                {daysStructure.map((day) => (
                  <div key={day} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{day}</h3>
                      <div className="w-1/2">
                         {/* NUOVO: NOTA DEL GIORNO */}
                        <input 
                          type="text" 
                          placeholder={`Note specifiche per ${day}...`}
                          value={dayNotes[day] || ''}
                          onChange={(e) => setDayNotes({...dayNotes, [day]: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 focus:ring-1 focus:ring-blue-400 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {manualExercises.filter(ex => ex.DayTag === day).map((ex, i) => (
                        <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group">
                          <div>
                            <span className="font-bold text-slate-800 block">{ex.Esercizio.split(" - ")[1] || ex.Esercizio}</span>
                            <div className="flex gap-2 text-xs text-slate-500 mt-1">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">{ex.Serie} x {ex.Reps}</span>
                              <span>Rec: {ex.Recupero}</span>
                              {ex.Note && <span className="text-amber-600 italic flex items-center gap-1"><StickyNote size={10}/> {ex.Note}</span>}
                            </div>
                          </div>
                          <button onClick={() => {
                             // Per rimuovere dobbiamo trovare l'indice reale nell'array originale
                             const realIndex = manualExercises.indexOf(ex);
                             removeExercise(realIndex);
                          }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                      {manualExercises.filter(ex => ex.DayTag === day).length === 0 && (
                        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                          <p className="text-slate-400 text-sm">Nessun esercizio. Usa il modulo a sinistra.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}