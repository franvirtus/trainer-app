"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
// Rinonimo User in UserIcon per evitare conflitti con la variabile 'user'
import { Users, Plus, Search, LogOut, Dumbbell, User as UserIcon } from 'lucide-react';

const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Dashboard() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [coachName, setCoachName] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      // 1. Controlla Utente
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          router.push("/");
          return;
      }
      
      // 2. Imposta Nome Coach (Priorità al nome impostato)
      const meta = user.user_metadata || {};
      setCoachName(meta.name || meta.full_name || user.email?.split('@')[0]);

      // 3. Scarica Atleti
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (clientsData) setClients(clientsData);
    };

    fetchData();
  }, [router]);

  const createClient = async () => {
      const name = prompt("Nome e Cognome Atleta:");
      if (!name) return;
      
      const { error } = await supabase.from('clients').insert([{ full_name: name }]);
      if (error) alert(error.message);
      else window.location.reload(); // Ricarica rapida per vedere il nuovo atleta
  };

  const filteredClients = clients.filter(c => 
    (c.full_name || c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="max-w-md mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Users className="text-blue-500"/> I Miei Atleti
                </h1>
                <p className="text-slate-400 text-sm font-medium">Ciao, {coachName}</p>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-900/50 transition">
                <LogOut size={20}/>
            </button>
        </div>

        {/* BARRA RICERCA E TASTO + */}
        <div className="flex gap-2 mb-6">
            <div className="flex-1 bg-slate-800 rounded-xl flex items-center px-4 border border-slate-700">
                <Search size={20} className="text-slate-500"/>
                <input 
                    type="text" 
                    placeholder="Cerca atleta..." 
                    className="bg-transparent border-none outline-none text-white p-3 w-full placeholder:text-slate-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <button onClick={createClient} className="bg-blue-600 w-12 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/50 hover:bg-blue-500 transition">
                <Plus size={24}/>
            </button>
        </div>

        {/* LISTA CLIENTI */}
        <div className="space-y-3">
            {filteredClients.length === 0 ? (
                <p className="text-center text-slate-500 py-10">Nessun atleta trovato.</p>
            ) : (
                filteredClients.map(client => (
                    <div 
                        key={client.id} 
                        onClick={() => router.push(`/admin/clients/${client.id}`)}
                        className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between hover:border-blue-500 transition cursor-pointer active:scale-95"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
                                <UserIcon size={20}/>
                            </div>
                            <div>
                                <h3 className="font-bold text-white capitalize">{client.full_name || client.name}</h3>
                                <p className="text-xs text-slate-500">Clicca per gestire</p>
                            </div>
                        </div>
                        <Dumbbell size={20} className="text-slate-600"/>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
}