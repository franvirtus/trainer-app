"use client";
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, Dumbbell } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Inizializzazione sicura che legge dal tuo .env.local
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Errore login: " + error.message);
      setLoading(false);
    } else {
      // Refresh necessario per far leggere i nuovi cookie a Next.js
      router.refresh();
      router.push('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-4 border-slate-800">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white">
            <Dumbbell size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Trainer Access</h1>
          <p className="text-slate-500 text-sm">Entra per gestire i tuoi atleti</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email</label>
            <div className="flex items-center bg-slate-100 rounded-xl p-3 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
              <Mail size={20} className="text-slate-400 mr-3" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.com"
                className="bg-transparent outline-none w-full text-slate-800 font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
            <div className="flex items-center bg-slate-100 rounded-xl p-3 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
              <Lock size={20} className="text-slate-400 mr-3" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent outline-none w-full text-slate-800 font-medium"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-70"
          >
            {loading ? "Accesso..." : <>ENTRA <ArrowRight size={20}/></>}
          </button>
        </form>
      </div>
    </div>
  );
}