"use client";
// 1. FORZIAMO LA MODALITÀ DINAMICA (Risolve errore Prerender)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Plus, Users, ChevronRight, LogOut } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  
  // Qui usiamo createClient di Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [clients, setClients] = useState([]);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (data) setClients(data);
  };

  // 2. RINOMINATA LA FUNZIONE (Era 'createClient', creava conflitto!)
  const createNewAthlete = async () => {
    const name = prompt("Nome del nuovo atleta:");
    if (!name) return;

    const { error } = await supabase.from('clients').insert([{ name }]);
    if (error) alert("Errore: " + error.message);
    else fetchClients();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* NAVBAR */}
      <div className="bg-slate-900 text-white p-6 sticky top-0 z-10 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="text-blue-400"/> I Miei Atleti
        </h1>
        <button onClick={() => router.push('/')} className="p-2 bg-slate-800 rounded-full hover:bg-red-500 hover:text-white transition">
            <LogOut size={18}/>
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        
        {/* LISTA CLIENTI */}
        <div className="grid gap-3">
            {clients.map(client => (
                <div 
                    key={client.id} 
                    onClick={() => router.push(`/admin/clients/${client.id}`)}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl group-hover:bg-blue-100 group-hover:text-blue-600 transition">
                            {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{client.name}</h3>
                            <p className="text-xs text-slate-400">Atleta</p>
                        </div>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-blue-500"/>
                </div>
            ))}
        </div>

        {/* FAB (Floating Action Button) */}
        <button 
            onClick={createNewAthlete} // Usa la nuova funzione rinominata
            className="fixed bottom-8 right-8 bg-blue-600 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 hover:bg-blue-500 transition-all"
        >
            <Plus size={32}/>
        </button>

      </div>
    </div>
  );
}