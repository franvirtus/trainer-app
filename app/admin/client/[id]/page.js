"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Calendar, Dumbbell, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function ClientDetailPage({ params }) {
  const { id } = use(params); // Recuperiamo l'ID dell'atleta dall'URL
  const router = useRouter();
  
  const [client, setClient] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- CHIAVI DIRETTE (Fix per Vercel) ---
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  // ---------------------------------------

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    // 1. Scarica dati atleta
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (clientError) {
        alert("Errore caricamento atleta");
        console.error(clientError);
        return;
    }
    setClient(clientData);

    // 2. Scarica le schede (programs) di questo atleta
    const { data: progData, error: progError } = await supabase
      .from('programs')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false });

    if (progData) setPrograms(progData);
    setLoading(false);
  };

  const deleteProgram = async (programId) => {
      if(!confirm("Sei sicuro di voler eliminare questa scheda?")) return;

      const { error } = await supabase
          .from('programs')
          .delete()
          .eq('id', programId);
      
      if(error) alert("Errore cancellazione");
      else fetchData(); // Ricarica la lista
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Caricamento profilo...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Tasto Indietro */}
        <Link href="/admin" className="flex items-center text-slate-500 mb-6 hover:text-blue-600 gap-2 font-bold text-sm">
            <ArrowLeft size={18}/> Torna alla Dashboard
        </Link>

        {/* Intestazione Atleta */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">{client.full_name}</h1>
                <div className="text-slate-500 mt-1 flex gap-4 text-sm">
                    {client.email && <span>{client.email}</span>}
                    {client.phone && <span>{client.phone}</span>}
                </div>
            </div>
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold uppercase">
                {client.full_name.charAt(0)}
            </div>
        </div>

        {/* Sezione Schede */}
        <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                <Dumbbell size={24} className="text-blue-600"/> Schede di Allenamento
            </h2>
            
            {/* Bottone per creare NUOVA SCHEDA */}
            <Link href={`/admin/clients/${id}/new-program`} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg hover:shadow-blue-200 transition">
                <Plus size={20}/> Nuova Scheda
            </Link>
        </div>

        {/* Lista Schede */}
        {programs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                <p>Nessuna scheda presente.</p>
                <p className="text-sm">Clicca su "Nuova Scheda" per crearne una.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {programs.map(program => (
                    <div key={program.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{program.title}</h3>
                            <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                                <Calendar size={14}/> Creata il: {new Date(program.created_at).toLocaleDateString('it-IT')}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href={`/live/${program.id}`} target="_blank" className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
                                Apri Live
                            </Link>
                            <button onClick={() => deleteProgram(program.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition">
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
}