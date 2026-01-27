"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Plus, LogOut, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  
  // CONFIGURAZIONE DIRETTA (Per evitare dubbi)
  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [clients, setClients] = useState([]);
  const [myID, setMyID] = useState(''); // Per debug
  const [debugError, setDebugError] = useState('');

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    // 1. CHI SONO IO?
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Errore Auth:", authError);
      router.push('/'); 
      return;
    }

    setMyID(user.id); // Salvo il mio ID per vederlo a schermo

    // 2. SCARICA TUTTO (SENZA FILTRI) - DEBUG MODE
    // Togliamo .eq('trainer_id', user.id) per vedere se esistono atleti "persi"
    const { data: allClients, error: dbError } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
        setDebugError("Errore DB: " + dbError.message);
    } else {
        setClients(allClients || []);
    }
  };

  const createNewAthlete = async () => {
    const name = prompt("Nome atleta (Debug Mode):");
    if (!name) return;
    
    // Rileggiamo l'utente per sicurezza
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        alert("Errore: Non sei loggato!");
        return;
    }
    
    // Inseriamo stampando eventuali errori
    const { data, error } = await supabase
        .from('clients')
        .insert([{ 
            name: name, 
            trainer_id: user.id // Proviamo a forzare l'ID
        }])
        .select();
        
    if (error) {
        alert("ERRORE INSERIMENTO: " + error.message + "\nCodice: " + error.code);
    } else {
        alert("Inserito! ID Atleta: " + (data[0]?.id || 'N/A'));
        checkUserAndFetch(); // Ricarica
    }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push('/');
  };

  return (
    <div className="min-h-screen bg-yellow-50 font-sans border-4 border-yellow-400">
      {/* NAVBAR DEBUG */}
      <div className="bg-slate-900 text-white p-6 sticky top-0 z-10">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold flex items-center gap-2 text-yellow-400">
                <AlertTriangle/> MODALITÀ DEBUG
                </h1>
                <p className="text-xs font-mono text-slate-300 mt-1">
                    IL MIO ID: <span className="bg-slate-700 px-1 rounded text-white">{myID}</span>
                </p>
            </div>
            <button onClick={handleLogout} className="p-2 bg-slate-800 rounded-full hover:bg-red-500 transition"><LogOut size={18}/></button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        
        {debugError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>ERRORE RILEVATO:</strong> {debugError}
            </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow mb-6">
            <h2 className="font-bold mb-2">Stato Database ({clients.length} atleti totali):</h2>
            <p className="text-sm text-slate-500 mb-4">Se vedi atleti qui sotto, il DB funziona. Controlla se il loro "Trainer ID" è uguale al "TUO ID" scritto in alto.</p>
        </div>

        <div className="grid gap-3">
            {clients.map(client => {
                const isMine = client.trainer_id === myID;
                return (
                    <div key={client.id} className={`p-4 rounded-lg border-2 flex flex-col gap-1 ${isMine ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg">{client.name}</h3>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${isMine ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                {isMine ? 'È TUO ✅' : 'NON È TUO ❌'}
                            </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                            ID Atleta: {client.id}<br/>
                            Trainer ID: {client.trainer_id || 'NULL (Vuoto)'}
                        </div>
                    </div>
                );
            })}
        </div>

        <button onClick={createNewAthlete} className="fixed bottom-8 right-8 bg-blue-600 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all"><Plus size={32}/></button>
      </div>
    </div>
  );
}