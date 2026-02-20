"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr'; // Utilizza questo import per la compatibilità Vercel
import { useRouter } from 'next/navigation';
import { Plus, Users, ChevronRight, LogOut, User, Trash2 } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  
  // Inizializzazione sicura: legge le variabili che hai già su Vercel
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [clients, setClients] = useState([]);
  const [trainerName, setTrainerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) { 
      router.push('/login'); 
      return; 
    }

    setTrainerName(user.user_metadata?.first_name || user.email.split('@')[0]);

    // Scarica i clienti attivi usando la colonna full_name (già presente nel tuo schema)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error) setClients(data || []);
    setLoading(false);
  };

  const createNewClient = async () => {
    const name = prompt("Nome e Cognome nuovo atleta:");
    if (!name) return;

    const { error } = await supabase.from('clients').insert([{ 
      full_name: name,
      is_active: true 
    }]); 
    
    if (error) {
        alert("Errore creazione: " + error.message);
    } else {
        fetchData();
    }
  };

  const deactivateClient = async (e, clientId, clientName) => {
      e.stopPropagation(); 
      if(!confirm(`Vuoi archiviare l'atleta ${clientName}?`)) return;

      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', clientId);

      if (error) alert("Errore: " + error.message);
      else fetchData();
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      router.refresh();
      router.push('/login');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 bg-slate-50">
      <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full mr-3"></div>
      Caricamento...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="bg-slate-900 text-white p-6 sticky top-0 z-10 flex justify-between items-center shadow-lg">
        <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-blue-400"/> I Miei Atleti
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <User size={10}/> Ciao, {trainerName}
            </p>
        </div>
        <button onClick={handleLogout} className="p-2 bg-slate-800 rounded-full hover:bg-red-500 hover:text-white transition">
            <LogOut size={18}/>
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        {clients.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
                <Users size={48} className="mx-auto mb-4 opacity-10"/>
                <p>Nessun atleta trovato.</p>
                <p className="text-sm">Premi + per iniziare.</p>
            </div>
        ) : (
            <div className="grid gap-3">
                {clients.map(client => (
                    <div 
                        key={client.id} 
                        onClick={() => router.push(`/admin/clients/${client.id}`)}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                {(client.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <h3 className="font-bold text-lg text-slate-800">{client.full_name}</h3>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={(e) => deactivateClient(e, client.id, client.full_name)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                            >
                                <Trash2 size={18}/>
                            </button>
                            <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition"/>
                        </div>
                    </div>
                ))}
            </div>
        )}

        <button 
            onClick={createNewClient} 
            className="fixed bottom-8 right-8 bg-blue-600 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 hover:bg-blue-500 transition-all"
        >
            <Plus size={32}/>
        </button>
      </div>
    </div>
  );
}