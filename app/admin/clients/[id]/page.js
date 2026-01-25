"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Calendar, Dumbbell, Trash2, Mail, Phone, Edit3 } from 'lucide-react';
import Link from 'next/link';

export default function ClientDetailPage() {
  const params = useParams();
  const id = params?.id; 
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- CHIAVI DIRETTE ---
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);
  // ---------------------

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    const { data: clientData } = await supabase.from('clients').select('*').eq('id', id).single();
    if (clientData) setClient(clientData);

    const { data: progData } = await supabase.from('programs').select('*').eq('client_id', id).order('created_at', { ascending: false });
    if (progData) setPrograms(progData);
    setLoading(false);
  };

  const deleteProgram = async (programId) => {
      if(!confirm("Sei sicuro di voler eliminare questa scheda?")) return;
      const { error } = await supabase.from('programs').delete().eq('id', programId);
      if(!error) fetchData(); 
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Caricamento profilo...</div>;
  if (!client) return <div className="p-10 text-center text-red-500">Atleta non trovato.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/admin" className="flex items-center text-slate-500 mb-6 hover:text-blue-600 gap-2 font-bold text-sm">
            <ArrowLeft size={18}/> Torna alla Dashboard
        </Link>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">{client.full_name}</h1>
                <div className="text-slate-500 mt-2 flex flex-col gap-1 text-sm">
                    {client.email && <span className="flex items-center gap-2"><Mail size={14}/> {client.email}</span>}
                    {client.phone && <span className="flex items-center gap-2"><Phone size={14}/> {client.phone}</span>}
                </div>
            </div>
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold uppercase">
                {client.full_name.charAt(0)}
            </div>
        </div>

        <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                <Dumbbell size={24} className="text-blue-600"/> Schede di Allenamento
            </h2>
            <Link href={`/admin/clients/${id}/new-program`} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg hover:shadow-blue-200 transition">
                <Plus size={20}/> Nuova Scheda
            </Link>
        </div>

        {programs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                <p>Nessuna scheda presente.</p>
                <p className="text-sm">Clicca su "Nuova Scheda" per crearne una.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {programs.map(program => (
                    <div key={program.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition group">
                        
                        {/* LINK CHE PORTA ALL'EDITOR DEGLI ESERCIZI */}
                        <Link href={`/admin/editor/${program.id}`} className="flex-1 cursor-pointer">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition flex items-center gap-2">
                                    {program.title} <Edit3 size={14} className="opacity-0 group-hover:opacity-100 text-blue-500"/>
                                </h3>
                                <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                                    <Calendar size={14}/> Creata il: {new Date(program.created_at).toLocaleDateString('it-IT')}
                                </p>
                            </div>
                        </Link>

                        <div className="flex items-center gap-3">
                            <Link href={`/live/${program.id}`} target="_blank" className="text-blue-600 font-bold text-xs uppercase bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition">
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