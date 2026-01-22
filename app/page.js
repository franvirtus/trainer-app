"use client";
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';
import { UploadCloud, FileSpreadsheet, Loader2, ArrowRight, Eye, Trash2, Plus, List, Save, X, AlignLeft } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [schedaName, setSchedaName] = useState('');
  const [coachNotes, setCoachNotes] = useState(''); // NUOVO: Stato per le note globali
  const [savedWorkouts, setSavedWorkouts] = useState([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState('excel');
  const [file, setFile] = useState(null);

  const [manualExercises, setManualExercises] = useState([]);
  const [currentEx, setCurrentEx] = useState({
    day: '', 
    name: '',
    serie: '',
    reps: '',
    rec: '',
    video: '',
    note: '' // NUOVO: Note specifiche esercizio
  });

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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleUploadExcel = async () => {
    if (!file || !schedaName) {
      alert("Inserisci un nome scheda e seleziona un file!");
      return;
    }
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      await saveToSupabase(jsonData);
    };
    reader.readAsArrayBuffer(file);
  };

  const addExerciseToManualList = () => {
    if (!currentEx.name || !currentEx.serie || !currentEx.reps) {
      alert("Compila almeno Nome, Serie e Reps.");
      return;
    }

    const fullName = currentEx.day 
      ? `${currentEx.day.toUpperCase()} - ${currentEx.name}` 
      : currentEx.name;

    const newExercise = {
      Esercizio: fullName,
      Serie: currentEx.serie,
      Reps: currentEx.reps,
      Recupero: currentEx.rec || '60s',
      Video: currentEx.video,
      Note: currentEx.note // Salviamo la nota specifica
    };

    setManualExercises([...manualExercises, newExercise]);
    setCurrentEx({ ...currentEx, name: '', serie: '', reps: '', rec: '', video: '', note: '' });
  };

  const removeExercise = (index) => {
    const newList = [...manualExercises];
    newList.splice(index, 1);
    setManualExercises(newList);
  };

  const handleSaveManual = async () => {
    if (!schedaName || manualExercises.length === 0) {
      alert("Inserisci un nome scheda e aggiungi almeno un esercizio!");
      return;
    }
    setUploading(true);
    await saveToSupabase(manualExercises);
  };

  const saveToSupabase = async (contentData) => {
    const { data: insertedData, error } = await supabase
      .from('workout_templates')
      .insert([{ 
        title: schedaName, 
        coach_notes: coachNotes, // Salviamo le note globali
        content: contentData 
      }])
      .select();

    if (error) {
      alert("Errore: " + error.message);
    } else {
      alert("Scheda salvata con successo!");
      setFile(null);
      setSchedaName('');
      setCoachNotes('');
      setManualExercises([]);
      setMode('excel');
      fetchWorkouts();
    }
    setUploading(false);
  };

  const deleteWorkout = async (id) => {
    if (!confirm("Eliminare questa scheda?")) return;
    await supabase.from('workout_logs').delete().eq('assignment_id', id);
    const { error } = await supabase.from('workout_templates').delete().eq('id', id);
    if (!error) setSavedWorkouts(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="bg-blue-600 text-white p-8 rounded-3xl shadow-xl mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Trainer Dashboard</h1>
            <p className="opacity-80">Gestisci schede e note</p>
          </div>
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm min-w-[100px] text-center">
            <span className="text-2xl font-bold block">{savedWorkouts.length}</span>
            <span className="text-[10px] opacity-80 uppercase tracking-widest">Schede</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* CREATOR */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit">
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">1. Nome Atleta / Scheda</label>
              <input 
                type="text" 
                placeholder="Es. Giulia - Tonificazione" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                value={schedaName}
                onChange={(e) => setSchedaName(e.target.value)}
              />
            </div>

            {/* NUOVO CAMPO NOTE GLOBALI */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">2. Note Generali / Obiettivi (Opzionale)</label>
              <textarea 
                placeholder="Es. Questa settimana concentrati sulla fase eccentrica. Attenzione alla spalla nel Giorno B." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm h-24 resize-none"
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
              />
            </div>

            {/* TOGGLE */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button onClick={() => setMode('excel')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'excel' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <FileSpreadsheet size={16} /> Da Excel
              </button>
              <button onClick={() => setMode('manual')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'manual' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <List size={16} /> Manuale
              </button>
            </div>

            {mode === 'excel' && (
              <div className="animate-fade-in space-y-4">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer relative">
                  <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <UploadCloud className="mx-auto text-slate-300 mb-3" size={48} />
                  <p className="text-sm text-slate-500 font-medium">{file ? <span className="text-green-600 font-bold">{file.name}</span> : "Trascina Excel qui"}</p>
                </div>
                <button onClick={handleUploadExcel} disabled={uploading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-all flex justify-center items-center gap-2">
                  {uploading ? <Loader2 className="animate-spin" /> : "Salva Scheda"}
                </button>
              </div>
            )}

            {mode === 'manual' && (
              <div className="animate-fade-in">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4 space-y-3">
                  <div className="flex gap-2">
                     <div className="w-1/3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Giorno</label>
                      <input type="text" placeholder="Giorno A" className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={currentEx.day} onChange={e => setCurrentEx({...currentEx, day: e.target.value})} />
                    </div>
                    <div className="w-2/3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Esercizio</label>
                      <input type="text" placeholder="Es. Squat" className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={currentEx.name} onChange={e => setCurrentEx({...currentEx, name: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">Serie</label><input type="text" placeholder="4" className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={currentEx.serie} onChange={e => setCurrentEx({...currentEx, serie: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">Reps</label><input type="text" placeholder="10" className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={currentEx.reps} onChange={e => setCurrentEx({...currentEx, reps: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">Rec</label><input type="text" placeholder="60s" className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={currentEx.rec} onChange={e => setCurrentEx({...currentEx, rec: e.target.value})} /></div>
                  </div>
                  
                  {/* NUOVO CAMPO NOTE SPECIFICHE ESERCIZIO */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Note Esercizio (Opz)</label>
                    <input type="text" placeholder="Es. Gomiti stretti, fermo al petto..." className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={currentEx.note} onChange={e => setCurrentEx({...currentEx, note: e.target.value})} />
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Video URL</label>
                      <input type="text" placeholder="https://..." className="w-full p-2 rounded-lg border border-slate-200 text-sm" value={currentEx.video} onChange={e => setCurrentEx({...currentEx, video: e.target.value})} />
                    </div>
                    <button onClick={addExerciseToManualList} className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 transition-colors"><Plus size={20} /></button>
                  </div>
                </div>

                <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {manualExercises.map((ex, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-sm">
                      <div>
                        <span className="font-bold text-slate-700 block">{ex.Esercizio}</span>
                        <span className="text-xs text-slate-500">{ex.Serie}x{ex.Reps} {ex.Note && `• Note: ${ex.Note}`}</span>
                      </div>
                      <button onClick={() => removeExercise(i)} className="text-slate-300 hover:text-red-500"><X size={16} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={handleSaveManual} disabled={uploading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-all flex justify-center items-center gap-2">
                  {uploading ? <Loader2 className="animate-spin" /> : <><Save size={18}/> Salva Scheda</>}
                </button>
              </div>
            )}
          </div>

          {/* LISTA SCHEDE */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Eye className="text-purple-500" /> Schede Recenti</h2>
            {loadingWorkouts ? <p className="text-slate-400 text-sm">Caricamento...</p> : (
              <div className="space-y-3 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {savedWorkouts.map((workout) => (
                  <div key={workout.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative">
                    <button onClick={() => deleteWorkout(workout.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                    <div className="flex justify-between items-start mb-4 pr-8">
                      <div>
                        <h3 className="font-bold text-slate-800">{workout.title}</h3>
                        <p className="text-xs text-slate-400">{new Date(workout.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/report/${workout.id}`} className="flex-1 bg-purple-50 text-purple-600 text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-100 border border-purple-100"><Eye size={16} /> Report</Link>
                      <Link href={`/scheda/${workout.id}`} className="flex-1 bg-blue-50 text-blue-600 text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-100 border border-blue-100"><ArrowRight size={16} /> Scheda</Link>
                    </div>
                    <div className="mt-3 text-center">
                       <button onClick={() => {navigator.clipboard.writeText(`https://trainer-app-nine.vercel.app/scheda/${workout.id}`); alert("Link copiato!");}} className="text-[10px] text-slate-400 hover:text-blue-500 underline">Copia Link</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}