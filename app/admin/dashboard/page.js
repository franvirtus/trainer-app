"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Users, ChevronRight, LogOut, User, Plus, Trash2, X } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();

  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";

  const supabase = useMemo(() => createClient(supabaseUrl, supabaseKey), []);

  const [clients, setClients] = useState([]);
  const [trainerName, setTrainerName] = useState("");
  const [loading, setLoading] = useState(true);

  // MODAL NUOVO ATLETA
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr || !user) {
      router.push("/");
      return;
    }

    setTrainerName(user.user_metadata?.first_name || user.email.split("@")[0]);

    const { data, error } = await supabase
      .from("clients")
      .select("id, created_at, full_name, email, phone")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Errore DB: " + error.message);
      setClients([]);
    } else {
      setClients(data || []);
    }

    setLoading(false);
  };

  const openCreate = () => {
    setForm({ full_name: "", email: "", phone: "" });
    setShowCreate(true);
  };

  const createAthlete = async () => {
    const fullName = (form.full_name || "").trim();
    if (!fullName) {
      alert("Inserisci almeno Nome e Cognome.");
      return;
    }

    setBusy(true);
    const payload = {
      full_name: fullName,
      email: (form.email || "").trim() || null,
      phone: (form.phone || "").trim() || null,
    };

    const { error } = await supabase.from("clients").insert([payload]);

    setBusy(false);

    if (error) {
      alert("Errore DB: " + error.message);
      return;
    }

    setShowCreate(false);
    fetchData();
  };

  // ✅ ELIMINA ATLETA (cascata in app)
  const deleteAthlete = async (clientId, displayName) => {
    const ok = confirm(
      `Eliminare definitivamente l'atleta "${displayName}"?\n\nVerranno eliminate anche schede, esercizi e log collegati.`
    );
    if (!ok) return;

    setBusy(true);
    try {
      // 1) prendo i programmi dell'atleta
      const { data: progs, error: pErr } = await supabase
        .from("programs")
        .select("id")
        .eq("client_id", clientId);

      if (pErr) throw pErr;

      const progIds = (progs || []).map((p) => p.id);

      if (progIds.length > 0) {
        // 2) cancello logs
        const { error: lErr } = await supabase
          .from("workout_logs")
          .delete()
          .in("program_id", progIds);

        if (lErr) throw lErr;

        // 3) cancello exercises
        const { error: eErr } = await supabase
          .from("exercises")
          .delete()
          .in("program_id", progIds);

        if (eErr) throw eErr;

        // 4) cancello programs
        const { error: prErr } = await supabase
          .from("programs")
          .delete()
          .in("id", progIds);

        if (prErr) throw prErr;
      }

      // 5) cancello client
      const { error: cErr } = await supabase.from("clients").delete().eq("id", clientId);
      if (cErr) throw cErr;

      await fetchData();
    } catch (err) {
      alert("Errore eliminazione: " + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Caricamento...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* HEADER */}
      <div className="bg-slate-900 text-white p-6 sticky top-0 z-10 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-blue-400" /> I Miei Atleti
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <User size={10} /> Ciao, {trainerName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm flex items-center gap-2 transition disabled:opacity-60"
            disabled={busy}
          >
            <Plus size={18} /> Aggiungi atleta
          </button>

          <button
            onClick={handleLogout}
            className="p-2 bg-slate-800 rounded-full hover:bg-red-500 hover:text-white transition"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        {clients.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p>Nessun atleta trovato.</p>
            <p className="text-sm">Usa “Aggiungi atleta”.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {clients.map((client) => {
              const displayName = (client.full_name || "").trim() || "Senza nome";
              const initial = displayName.charAt(0).toUpperCase() || "?";

              return (
                <div
                  key={client.id}
                  onClick={() => router.push(`/admin/clients/${client.id}`)}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xl text-blue-600">
                      {initial}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{displayName}</h3>
                      {(client.email || client.phone) && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {client.email || client.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAthlete(client.id, displayName);
                      }}
                      className="p-2 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition"
                      title="Elimina atleta"
                      disabled={busy}
                    >
                      <Trash2 size={18} />
                    </button>
                    <ChevronRight className="text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL CREA ATLETA */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div className="font-bold text-slate-900">Nuovo atleta</div>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-full hover:bg-slate-100 transition"
                aria-label="Chiudi"
                disabled={busy}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome e Cognome *</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  placeholder="Es. Marco Rossi"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  placeholder="Es. marco@email.it"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Telefono</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-slate-300 outline-none focus:border-blue-500"
                  placeholder="Es. 3331234567"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition"
                  disabled={busy}
                >
                  Annulla
                </button>
                <button
                  onClick={createAthlete}
                  className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition disabled:opacity-60"
                  disabled={busy}
                >
                  Crea atleta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BLOCCO CLICK mentre busy (opzionale) */}
      {busy && <div className="fixed inset-0 z-40" />}
    </div>
  );
}
