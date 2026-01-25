"use client";
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft, Dumbbell, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function NewProgramPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id; // L'ID dell'atleta preso dall'URL

  const [loading, setLoading] = useState(false);
  
  // --- CHIAVI DIRETTE ---
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  // ---------------------

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0] // Oggi come default
  });

  const saveProgram = async () => {
    if (!formData.title.trim()) return alert("Dai un titolo alla scheda!");
    
    setLoading(true);

    // 1. Recuperiamo il nome dell'atleta per sicurezza (opzionale, ma utile nel DB)
    const { data: client } = await supabase.from('clients').select('full_name').eq('id', clientId).single();
    const clientName = client ? client.full_name : 'Atleta';

    // 2. Creiamo la scheda
    const { error } = await supabase
      .from('programs')
      .insert([{
          client_id: clientId,
          client_name: clientName,
          title: formData.title,
          notes: formData.description,
          created_at: new Date().toISOString()
      }]);

    if (error) {
        alert("Errore: " + error.message);
        setLoading(false);
    } else {
        // Successo! Torniamo al profilo dell'atleta
        router.push(`/admin/clients/${clientId}`); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans flex flex-col items-center">
      <div className="max-w-xl w-full">
        
        <button onClick={() => router.back()} className="flex items-center text-slate-500 mb-6 hover:text-blue-600 gap-2 font-bold text-sm">
            <ArrowLeft size={18}/> Annulla
        </button>

        <h1 className="text-2xl font-bold text-slate-800 mb-6">Nuova Scheda Allenamento</h1>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            
            {/* TITOLO SCHEDA */}
            <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Dumbbell size={12}/> Titolo Scheda *</label>
                <input 
                    type="text" 
                    placeholder="Es. Forza Mesociclo 1" 
                    className="w-full p-3 border border-slate-200 rounded-xl font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
            </div>

            {/* DATA (Opzionale, solo visiva) */}
            <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Data Inizio</label>
                <input 
                    type="date" 
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
            </div>

            {/* NOTE / OBIETTIVI */}
            <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><FileText size={12}/> Obiettivi / Note</label>
                <textarea 
                    placeholder="Note generali per questa scheda..." 
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm h-32 outline-none focus:border-blue-500 resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
            </div>

            <button 
                onClick={saveProgram} 
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 hover:scale-[1.02] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
                {loading ? "Creazione in corso..." : <><Save size={20}/> CREA SCHEDA</>}
            </button>

        </div>
      </div>
    </div>
  );
}