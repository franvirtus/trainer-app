"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Plus, Users, ChevronRight, LogOut, User } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [clients, setClients] = useState([]);
  const [trainerName, setTrainerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }

    // Nome utente (dai metadata o dalla mail)
    setTrainerName(user.user_metadata?.first_name || user.email.split('@')[0]);

    // SCARICA I CLIENTI (Il filtro avviene automatico grazie alla Policy SQL che abbiamo appena messo)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setClients(data || []);
    setLoading(false);
  };

  const createClient = async () => {
    const name = prompt("Nome nuovo atleta:");
    if (!name) return;

    // Non serve più passare trainer_id, il DB lo mette in automatico!
    const { error } = await supabase.from('clients').insert([{ name }]);
    
    if (error) alert("Errore: " + error.message);
    else fetchData();
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push('/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Caricamento...</div>;

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
                <p>Nessun atleta trovato.</p>
                <p className="text-sm">Premi + per iniziare.</p>
            </div>
        ) : (
            <div className="grid gap-3">
                {clients.map(client => (
                    <div 
                        key={client.id} 
                        onClick={() => router.push(`/admin/clients/${client.id}`)}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl text-blue-600">
                                {client.name.charAt(0).toUpperCase()}
                            </div>
                            <h3 className="font-bold text-lg text-slate-800">{client.name}</h3>
                        </div>
                        <ChevronRight className="text-slate-300"/>
                    </div>
                ))}
            </div>
        )}

        <button 
            onClick={createClient} 
            className="fixed bottom-8 right-8 bg-blue-600 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 hover:bg-blue-500 transition-all"
        >
            <Plus size={32}/>
        </button>
      </div>
    </div>
  );
}