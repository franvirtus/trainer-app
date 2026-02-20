"use client";
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr'; // Cambiato per coerenza con la dashboard
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, User, Mail, Phone, FileText, Users } from 'lucide-react';
import Link from 'next/link';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Usa le variabili del file .env.local o di Vercel
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [formData, setFormData] = useState({
    full_name: '',
    gender: 'F',
    email: '',
    phone: '',
    notes: '',
    is_active: true // Assicuriamoci che il nuovo atleta sia attivo
  });

  const saveClient = async () => {
    if (!formData.full_name.trim()) return alert("Inserisci almeno il nome e cognome!");
    
    setLoading(true);
    const { error } = await supabase
      .from('clients')
      .insert([formData]);

    if (error) {
        alert("Errore: " + error.message);
        setLoading(false);
    } else {
        router.push('/admin/dashboard'); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans flex flex-col items-center">
      <div className="max-w-xl w-full">
        <Link href="/admin/dashboard" className="flex items-center text-slate-500 mb-6 hover:text-blue-600 gap-2 font-bold text-sm">
            <ArrowLeft size={18}/> Annulla e torna indietro
        </Link>

        <h1 className="text-2xl font-bold text-slate-800 mb-6">Nuova Anagrafica Atleta</h1>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><User size={12}/> Nome Completo *</label>
                <input 
                    type="text" 
                    placeholder="Es. Giulia Verdi" 
                    className="w-full p-3 border border-slate-200 rounded-xl font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Users size={12}/> Sesso</label>
                    <select
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 bg-white"
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                        <option value="F">Femmina</option>
                        <option value="M">Maschio</option>
                    </select>
                </div>
                <div className="border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center p-3">
                    <img
                        src={formData.gender === "M" ? "/body-male.png" : "/body-female.png"}
                        alt="Sagoma"
                        className="h-28 object-contain opacity-90"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Mail size={12}/> Email</label>
                    <input 
                        type="email" 
                        placeholder="email@esempio.com" 
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Phone size={12}/> Telefono</label>
                    <input 
                        type="tel" 
                        placeholder="+39 333..." 
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><FileText size={12}/> Note Iniziali</label>
                <textarea 
                    placeholder="Obiettivi, infortuni, note varie..." 
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm h-32 outline-none focus:border-blue-500 resize-none"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
            </div>

            <button 
                onClick={saveClient} 
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 hover:scale-[1.02] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
                {loading ? "Salvataggio..." : <><Save size={20}/> CREA ATLETA</>}
            </button>
        </div>
      </div>
    </div>
  );
}