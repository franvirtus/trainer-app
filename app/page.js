"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, Users, ChevronRight, Mail } from 'lucide-react';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function HomePage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setClients(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Portale Trainer</h1>
            <p className="text-slate-500">Gestione Atleti e Schede</p>
          </div>
          
          <Link href="/admin/new-client" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg">
            <UserPlus size={20} /> Nuovo Atleta
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400">Caricamento atleti...</div>
        ) : clients.length === 0 ? (
          <div className="bg-white p-10 rounded-xl text-center shadow-sm border border-slate-200">
             <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><Users size={32}/></div>
             <h3 className="font-bold text-slate-700 mb-2">Nessun Atleta Trovato</h3>
             <p className="text-slate-500 text-sm">Clicca su "Nuovo Atleta" per iniziare.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {clients.map((client) => (
              <Link key={client.id} href={`/admin/clients/${client.id}`}>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center hover:border-blue-300 hover:shadow-md transition cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg uppercase">
                        {client.full_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition">{client.full_name}</h3>
                        <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                            {client.email && <span className="flex items-center gap-1"><Mail size={10}/> {client.email}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-slate-300 group-hover:text-blue-500">
                       <span className="text-xs font-bold mr-2 uppercase tracking-wide">Apri Profilo</span>
                       <ChevronRight size={20} />
                    </div>
                  </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}