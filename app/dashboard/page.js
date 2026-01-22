"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Eye, Trash2, ArrowRight, PlusCircle, Search } from 'lucide-react';
import Link from 'next/link';

export default function DashboardList() {
  const [savedWorkouts, setSavedWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setSavedWorkouts(data);
    setLoading(false);
  };

  const deleteWorkout = async (id) => {
    if (!confirm("Sei sicuro? Verranno eliminati anche i feedback.")) return;
    await supabase.from('workout_logs').delete().eq('assignment_id', id);
    await supabase.from('workout_templates').delete().eq('id', id);
    setSavedWorkouts(prev => prev.filter(w => w.id !== id));
  };

  const filteredWorkouts = savedWorkouts.filter(w => 
    w.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header con Tasto "Crea Nuova" */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Archivio Schede</h1>
            <p className="text-slate-500">Gestisci i tuoi {savedWorkouts.length} atleti</p>
          </div>
          <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex gap-2 items-center">
            <PlusCircle size={20} /> Crea Nuova Scheda
          </Link>
        </div>

        {/* Barra di Ricerca */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex gap-3 items-center">
          <Search className="text-slate-300" />
          <input 
            type="text" 
            placeholder="Cerca per nome atleta..." 
            className="flex-1 outline-none text-slate-700 font-medium placeholder:font-normal"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Lista */}
        {loading ? <p>Caricamento...</p> : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredWorkouts.map((workout) => (
              <div key={workout.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative">
                <button onClick={() => deleteWorkout(workout.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                
                <div className="mb-4">
                  <h3 className="font-bold text-lg text-slate-800">{workout.title}</h3>
                  <p className="text-xs text-slate-400">Creata il {new Date(workout.created_at).toLocaleDateString()}</p>
                </div>

                <div className="flex gap-2">
                  <Link href={`/report/${workout.id}`} className="flex-1 bg-purple-50 text-purple-600 text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-100 transition-colors">
                    <Eye size={16} /> Report
                  </Link>
                  <Link href={`/scheda/${workout.id}`} className="flex-1 bg-blue-50 text-blue-600 text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                    <ArrowRight size={16} /> Scheda
                  </Link>
                </div>
                 <button onClick={() => {navigator.clipboard.writeText(`https://trainer-app-nine.vercel.app/scheda/${workout.id}`); alert("Link copiato!");}} className="block w-full mt-3 text-[10px] text-slate-400 hover:text-blue-500 underline text-center">Copia Link Atleta</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}