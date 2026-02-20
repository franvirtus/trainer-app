"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Search, Plus, Dumbbell, Trash2, ArrowLeft } from 'lucide-react';

export default function ExerciseLibrary() {
  const router = useRouter();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Scarica gli esercizi dal database
  const fetchExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore:', error);
    } else {
      setExercises(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  // Filtro di ricerca
  const filteredExercises = exercises.filter(ex => 
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.muscle_group?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Intestazione */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                 <button onClick={() => router.push('/admin/dashboard')} className="p-2 hover:bg-slate-200 rounded-full transition">
                    <ArrowLeft size={24} className="text-slate-700"/>
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Libreria Esercizi</h1>
                    <p className="text-slate-500">Gestisci il tuo archivio ({exercises.length} esercizi)</p>
                </div>
            </div>

            <button 
                onClick={() => router.push('/admin/exercises')}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg w-full md:w-auto justify-center"
            >
                <Plus size={20} />
                <span>NUOVO ESERCIZIO</span>
            </button>
        </div>

        {/* Barra Ricerca */}
        <div className="relative mb-8">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
                type="text" 
                placeholder="Cerca panca, squat, pettorali..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
        </div>

        {/* Griglia */}
        {loading ? (
            <div className="text-center py-20 text-slate-400">Caricamento libreria...</div>
        ) : filteredExercises.length === 0 ? (
            <div className="text-center py-20">Nessun esercizio trovato.</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExercises.map((exercise) => (
                    <div key={exercise.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition group">
                        
                        {/* Immagine */}
                        <div className="h-48 bg-slate-100 relative overflow-hidden">
                            {exercise.image_url ? (
                                <img 
                                    src={exercise.image_url} 
                                    alt={exercise.name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <Dumbbell size={48} />
                                </div>
                            )}
                            <span className="absolute top-3 right-3 bg-slate-900/80 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                                {exercise.category}
                            </span>
                        </div>

                        {/* Dati */}
                        <div className="p-5">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">{exercise.muscle_group}</p>
                            <h3 className="text-lg font-bold text-slate-800 truncate">{exercise.name}</h3>
                            
                            {exercise.video_url && (
                                <a 
                                    href={exercise.video_url} 
                                    target="_blank" 
                                    className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-slate-500 hover:text-blue-600"
                                >
                                    Guarda Tutorial 
                                    <span className="text-xs">↗</span>
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
}