"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Plus, Users, ChevronRight, LogOut, User } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient("https://hamzjxkedatewqbqidkm.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM");

  const [clients, setClients] = useState([]);
  const [trainerName, setTrainerName] = useState('');

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }

    setTrainerName(user.user_metadata?.first_name || user.email.split('@')[0]); 

    // FILTRO: Prendo solo i clienti con trainer_id = user.id
    const { data: myClients } = await supabase
      .from('clients')
      .select('*')
      .eq('trainer_id', user.id)
      .order('created_at', { ascending: false });

    if (myClients) setClients(myClients);
  };

  const createNewAthlete = async () => {
    const name = prompt("Nome atleta:");
    if (!name) return;
    const { data: { user } } = await supabase.auth.getUser();
    
    // ASSOCIAZIONE: Il nuovo cliente avrà il MIO id come trainer_id
    await supabase.from('clients').insert([{ name, trainer_id: user.id }]);
    checkUserAndFetch();
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="bg-slate-900 text-white p-6 sticky top-0 z-10 flex justify-between items-center shadow-lg">
        <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Users className="text-blue-400"/> I Miei Atleti</h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><User size={10}/> Ciao, {trainerName}</p>
        </div>
        <button onClick={handleLogout} className="p-2 bg-slate-800 rounded-full hover:bg-red-500 transition"><LogOut size={18}/></button>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <div className="grid gap-3">
            {clients.map(client => (
                <div key={client.id} onClick={() => router.push(`/admin/clients/${client.id}`)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center cursor-pointer hover:border-blue-500 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl">{client.name.charAt(0).toUpperCase()}</div>
                        <h3 className="font-bold text-lg text-slate-800">{client.name}</h3>
                    </div>
                    <ChevronRight className="text-slate-300"/>
                </div>
            ))}
        </div>
        <button onClick={createNewAthlete} className="fixed bottom-8 right-8 bg-blue-600 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all"><Plus size={32}/></button>
      </div>
    </div>
  );
}