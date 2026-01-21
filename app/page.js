"use client";
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';
import { UploadCloud, FileSpreadsheet, Loader2, ArrowRight, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [schedaName, setSchedaName] = useState('');
  const [savedWorkouts, setSavedWorkouts] = useState([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

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

  const handleUpload = async () => {
    if (!file || !schedaName) {
      alert("Inserisci un nome e seleziona un file!");
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

      const { data: insertedData, error } = await supabase
        .from('workout_templates')
        .insert([{ title: schedaName, content: jsonData }])
        .select();

      if (error) {
        alert("Errore: " + error.message);
      } else {
        alert("Scheda salvata! ID: " + insertedData[0].id);
        setFile(null);
        setSchedaName('');
        fetchWorkouts();
      }
      setUploading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // --- NUOVA FUNZIONE PER CANCELLARE ---
  const deleteWorkout = async (id) => {
    if (!confirm("Sei sicuro di voler eliminare questa scheda? Anche i report verranno persi.")) return;

    // 1. Cancella prima i log associati (note atleta)
    await supabase.from('workout_logs').delete().eq('assignment_id', id);

    // 2. Cancella la scheda
    const { error } = await supabase.from('workout_templates').delete().eq('id', id);

    if (error) {
      alert("Errore durante l'eliminazione: " + error.message);
    } else {
      // Rimuovi visivamente dalla lista senza ricaricare tutto
      setSavedWorkouts(prev => prev.filter(w => w.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="bg-blue-600 text-white p-8 rounded-3xl shadow-xl mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Trainer Dashboard</h1>
            <p className="opacity-80">Gestisci i tuoi atleti e monitora i progressi</p>
          </div>
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
            <span className="text-2xl font-bold">{savedWorkouts.length}</span>
            <span className="text-xs block opacity-80 uppercase">Schede Attive</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* COLONNA 1: CARICA NUOVA SCHEDA */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <UploadCloud className="text-blue-500" />
              Nuova Scheda
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome Atleta / Scheda</label>
                <input 
                  type="text" 
                  placeholder="Es. Marco - Ipetrofia A" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={schedaName}
                  onChange={(e) => setSchedaName(e.target.value)}
                />
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer relative">
                <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                <FileSpreadsheet className="mx-auto text-slate-300 mb-2" size={40} />
                <p className="text-sm text-slate-500 font-medium">
                  {file ? <span className="text-green-600 font-bold">{file.name}</span> : "Trascina qui il file Excel"}
                </p>
              </div>

              <button 
                onClick={handleUpload} 
                disabled={uploading}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-all flex justify-center items-center gap-2"
              >
                {uploading ? <Loader2 className="animate-spin" /> : "Salva nel Cloud"}
              </button>
            </div>
          </div>

          {/* COLONNA 2: LISTA SCHEDE RECENTI */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Eye className="text-purple-500" />
              Schede Recenti
            </h2>

            {loadingWorkouts ? (
              <p className="text-slate-400 text-sm">Caricamento schede...</p>
            ) : (
              <div className="space-y-3 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {savedWorkouts.map((workout) => (
                  <div key={workout.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative">
                    
                    {/* Pulsante Cestino (in alto a destra) */}
                    <button 
                      onClick={() => deleteWorkout(workout.id)}
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-1"
                      title="Elimina scheda"
                    >
                      <Trash2 size={16} />
                    </button>

                    <div className="flex justify-between items-start mb-4 pr-8">
                      <div>
                        <h3 className="font-bold text-slate-800">{workout.title}</h3>
                        <p className="text-xs text-slate-400">Creata il {new Date(workout.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/report/${workout.id}`} className="flex-1 bg-purple-50 text-purple-600 text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-100 transition-colors border border-purple-100">
                        <Eye size={16} /> Report
                      </Link>
                      
                      <Link href={`/scheda/${workout.id}`} className="flex-1 bg-blue-50 text-blue-600 text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors border border-blue-100">
                        <ArrowRight size={16} /> Scheda
                      </Link>
                    </div>

                    {/* Copia Link Rapido */}
                    <div className="mt-3 text-center">
                       <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`http://localhost:3000/scheda/${workout.id}`);
                          alert("Link copiato!");
                        }}
                        className="text-[10px] text-slate-400 hover:text-blue-500 underline"
                      >
                        Copia Link per l'atleta
                      </button>
                    </div>
                  </div>
                ))}
                
                {savedWorkouts.length === 0 && (
                  <div className="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400">Nessuna scheda trovata.</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}