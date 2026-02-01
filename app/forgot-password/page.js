"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr'; // <--- FONDAMENTALE: Usa i cookie
import { useRouter } from 'next/navigation';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function UpdatePassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Usa il client che legge la sessione appena creata dal link della mail
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Aggiorna l'utente LOGGATO (quello che è arrivato dal link della mail)
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Successo! Mandiamo alla dashboard
      // refresh() serve per assicurarsi che il middleware veda il nuovo stato
      router.refresh();
      router.push('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-4 border-slate-800">
        
        <div className="text-center mb-8">
          <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Nuova Password</h1>
          <p className="text-slate-500 text-sm">Inserisci la tua nuova password sicura.</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nuova Password</label>
            <div className="flex items-center bg-slate-100 rounded-xl p-3 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
              <Lock size={20} className="text-slate-400 mr-3" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent outline-none w-full text-slate-800 font-medium"
                required
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-500 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-xl"
          >
            {loading ? <Loader2 className="animate-spin" size={20}/> : "AGGIORNA PASSWORD"}
          </button>
        </form>
      </div>
    </div>
  );
}