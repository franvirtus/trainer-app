"use client";
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Costruiamo l'URL del ponte per il login automatico
    const redirectUrl = `${window.location.origin}/auth/callback?next=/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-4 border-slate-800 relative">
        
        <button onClick={() => router.back()} className="absolute top-6 left-6 text-slate-400 hover:text-slate-800 transition">
            <ArrowLeft size={24}/>
        </button>

        <div className="text-center mb-8 mt-4">
          <h1 className="text-2xl font-bold text-slate-800">Recupero Password</h1>
          <p className="text-slate-500 text-sm">Inserisci la tua email per ricevere il link.</p>
        </div>

        {success ? (
            <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32}/>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Email Inviata!</h3>
                <p className="text-slate-500 text-sm">Controlla la tua casella di posta. Troverai un link magico per entrare e cambiare password.</p>
                <button onClick={() => router.push('/login')} className="mt-6 text-blue-600 font-bold hover:underline">Torna al Login</button>
            </div>
        ) : (
            <form onSubmit={handleReset} className="space-y-4">
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

            {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-500 text-xs font-bold flex items-center gap-2 justify-center">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-xl"
            >
                {loading ? <Loader2 className="animate-spin" size={20}/> : "INVIA LINK"}
            </button>
            </form>
        )}
      </div>
    </div>
  );
}