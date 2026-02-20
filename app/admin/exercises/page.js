"use client";
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, Save, ArrowLeft } from 'lucide-react';

export default function NewExercise() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    muscle_group: 'Pettorali',
    category: 'Forza',
    video_url: ''
  });

  // Collegamento al Database
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Gestione selezione file
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Salvataggio
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let image_url = null;

    try {
      // 1. CARICAMENTO FOTO (Se c'è)
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`; // Nome unico
        const filePath = `${fileName}`;

        // Upload nel Bucket "exercise-images"
        const { error: uploadError } = await supabase.storage
          .from('exercise-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Ottieni il Link pubblico per vederla
        const { data: publicUrlData } = supabase.storage
          .from('exercise-images')
          .getPublicUrl(filePath);

        image_url = publicUrlData.publicUrl;
      }

      // 2. SALVATAGGIO NEL DATABASE
      const { error: dbError } = await supabase
        .from('exercises')
        .insert([
          {
            name: formData.name,
            muscle_group: formData.muscle_group,
            category: formData.category,
            video_url: formData.video_url,
            image_url: image_url 
          }
        ]);

      if (dbError) throw dbError;

      alert('Esercizio salvato con successo!');
      // Pulisci il form
      setFormData({ name: '', muscle_group: 'Pettorali', category: 'Forza', video_url: '' });
      setFile(null);

    } catch (error) {
      alert('Errore: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        
        {/* Intestazione */}
        <div className="flex items-center mb-6">
            <button onClick={() => router.back()} className="mr-4 p-2 hover:bg-slate-200 rounded-full transition">
                <ArrowLeft size={24} className="text-slate-700"/>
            </button>
            <h1 className="text-3xl font-bold text-slate-800">Nuovo Esercizio</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Nome */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nome Esercizio</label>
              <input
                type="text"
                placeholder="es. Panca Piana"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Gruppo Muscolare */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Muscolo</label>
                    <select
                        value={formData.muscle_group}
                        onChange={(e) => setFormData({...formData, muscle_group: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option>Pettorali</option>
                        <option>Dorsali</option>
                        <option>Gambe</option>
                        <option>Spalle</option>
                        <option>Braccia</option>
                        <option>Addome</option>
                        <option>Cardio</option>
                    </select>
                </div>

                {/* Categoria */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Categoria</label>
                    <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option>Forza</option>
                        <option>Ipertrofia</option>
                        <option>Resistenza</option>
                        <option>Stretching</option>
                        <option>Mobilità</option>
                    </select>
                </div>
            </div>

            {/* Video */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Link Video (YouTube)</label>
              <input
                type="text"
                placeholder="https://youtube.com/..."
                value={formData.video_url}
                onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* FOTO UPLOAD */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Foto / Miniatura</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer relative">
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {file ? (
                        <div className="text-center">
                            <p className="text-blue-600 font-bold">{file.name}</p>
                            <p className="text-xs text-slate-400">Clicca per cambiare</p>
                        </div>
                    ) : (
                        <>
                            <Upload className="text-slate-400 mb-2" size={32} />
                            <p className="text-slate-500 text-sm">Trascina una foto o clicca qui</p>
                        </>
                    )}
                </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-blue-600 transition flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              <span>SALVA ESERCIZIO</span>
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}