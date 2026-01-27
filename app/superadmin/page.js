"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function SuperAdminPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/register-trainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Trainer ${form.firstName} creato!`);
      setForm({ firstName: '', lastName: '', email: '', password: '' });
    } catch (error) {
      alert("Errore: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <ShieldCheck className="text-blue-600"/> Area SuperAdmin
        </h1>
        <form onSubmit={handleRegister} className="space-y-4">
          <input name="firstName" placeholder="Nome" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full bg-slate-100 p-3 rounded-xl" required />
          <input name="lastName" placeholder="Cognome" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full bg-slate-100 p-3 rounded-xl" required />
          <input name="email" type="email" placeholder="Email PT" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-slate-100 p-3 rounded-xl" required />
          <input name="password" type="text" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-slate-100 p-3 rounded-xl" required />
          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-blue-600 transition">
            {loading ? "Creazione..." : "REGISTRA TRAINER"}
          </button>
        </form>
      </div>
    </div>
  );
}