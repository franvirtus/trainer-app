"use client";
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft, Dumbbell, Calendar, Clock } from 'lucide-react';

export default function NewProgramPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id; 

  const [loading, setLoading] = useState(false);
  
  // --- CHIAVI DIRETTE ---
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);
  // ---------------------

  const [formData, setFormData] = useState({
    title: '',
    duration: 4, // Default 4 settimane
    description: ''
  });

  const saveProgram = async () => {
    if (!formData.title.trim()) return alert("Dai un titolo alla scheda!");
    if (formData.duration < 1) return alert("La durata minima è 1 settimana!");
    
    setLoading(true);

    const { error } = await supabase
      .from('programs')
      .insert([{
          client_id: clientId,
          title: formData.title,
          duration: parseInt(formData.duration), // Salviamo la durata!
          notes: formData.description,
          created_at: new Date().toISOString()
      }]);

    if (error) {
        alert("Errore: " + error.message);
        setLoading(false);
    } else {
        router.push(`/admin/clients/${clientId}`); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans flex flex-col items-center">
      <div className="max-w-xl w-full">
        
        <button onClick={() => router.back()} className="flex items-center text-slate-500 mb-6 hover:text-blue-600 gap-2 font-bold text-sm">
            <ArrowLeft size={18}/> Annulla
        </button>

        <h1 className="text-2xl font-bold text-slate-800 mb-6">Imposta Nuova Scheda</h1>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            
            {/* TITOLO */}
            <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Dumbbell size={12}/> Nome Mesociclo *</label>
                <input 
                    type="text" 
                    placeholder="Es. Ipertrofia Phase 1" 
                    className="w-full p-3 border border-slate-200 rounded-xl font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
            </div>

            {/* DURATA (La parte nuova che volevi) */}
            <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Durata (Settimane) *</label>
                <div className="flex items-center gap-4">
                    <input 
                        type="range" 
                        min="1" max="12" 
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    />
                    <div className="w-16 h-12 flex items-center justify-center bg-blue-50 text-blue-700 font-bold text-xl rounded-xl border border-blue-100">
                        {formData.duration}
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">Questa scheda durerà {formData.duration} settimane.</p>
            </div>

            {/* NOTE */}
            <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Obiettivi / Note</label>
                <textarea 
                    placeholder="Note generali..." 
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm h-24 outline-none focus:border-blue-500 resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
            </div>

            <button 
                onClick={saveProgram} 
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 hover:scale-[1.02] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
                {loading ? "Creazione..." : <><Save size={20}/> CREA STRUTTURA</>}
            </button>

        </div>
      </div>
    </div>
  );
}