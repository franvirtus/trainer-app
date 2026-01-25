"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Plus, Calendar, Archive, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ClientProfilePage() {
  const params = useParams(); // Prende l'ID dall'URL
  const clientId = params.id;

  const [client, setClient] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        // 1. Scarica dati cliente
        const { data: clientData } = await supabase.from('clients').select('*').eq('id', clientId).single();
        setClient(clientData);

        // 2. Scarica le schede di QUESTO cliente
        if (clientData) {
            const { data: progData } = await supabase
                .from('programs')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });
            setPrograms(progData || []);
        }
        setLoading(false);
    };
    fetchData();
  }, [clientId]);

  if (loading) return <div className="p-10 text-center">Caricamento profilo...</div>;
  if (!client) return <div className="p-10 text-center text-red-500">Cliente non trovato</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* NAVIGAZIONE */}
        <Link href="/admin" className="flex items-center text-slate-500 mb-6 hover:text-blue-600 gap-2 font-bold text-sm">
            <ArrowLeft size={16}/> Torna alla Dashboard
        </Link>

        {/* HEADER PROFILO */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">{client.full_name}</h1>
                    <p className="text-slate-500">{client.notes || "Nessuna nota particolare"}</p>
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {client.is_active ? "Cliente Attivo" : "Archiviato"}
                </div>
            </div>
            
            <div className="mt-6 flex gap-4">
                {/* Questo bottone in futuro porterà al nuovo editor collegato al cliente */}
                <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg hover:scale-105 transition">
                    <Plus size={20} /> Nuova Scheda
                </button>
            </div>
        </div>

        {/* LISTA SCHEDE */}
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="text-blue-600"/> Programmi di Allenamento
        </h2>

        {programs.length === 0 ? (
            <div className="bg-slate-100 rounded-xl p-8 text-center text-slate-500 border border-slate-200 border-dashed">
                Questo atleta non ha ancora nessuna scheda. <br/>Clicca "Nuova Scheda" per iniziare.
            </div>
        ) : (
            <div className="space-y-4">
                {programs.map(prog => (
                    <div key={prog.id} className={`p-5 rounded-xl border flex justify-between items-center transition ${prog.is_archived ? 'bg-slate-100 border-slate-200 opacity-70' : 'bg-white border-slate-200 shadow-sm hover:border-blue-400'}`}>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg text-slate-800">{prog.title}</h3>
                                {prog.is_archived && <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase font-bold">Archiviata</span>}
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-4">
                                <span>Durata: {prog.duration_weeks} settimane</span>
                                <span>Creata il: {new Date(prog.created_at).toLocaleDateString('it-IT')}</span>
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <Link href={`/live/${prog.id}`} target="_blank" className="flex items-center gap-1 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100">
                                <PlayCircle size={16}/> Vedi Live
                            </Link>
                            <button className="p-2 text-slate-400 hover:text-slate-600" title="Archivia/Modifica">
                                <Archive size={18}/>
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