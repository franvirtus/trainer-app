"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Users, ChevronRight, LogOut, User, X, Plus } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();

  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";

  const supabase = useMemo(() => createClient(supabaseUrl, supabaseKey), []);

  const [clients, setClients] = useState([]);
  const [trainerName, setTrainerName] = useState("");
  const [loading, setLoading] = useState(true);

  // MODAL state
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [goal, setGoal] = useState("");

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

    // ora selezioniamo anche i nuovi campi (se vuoi mostrarli)
    const { data, error } = await supabase
      .from("clients")
      .select("id, created_at, full_name, email, phone, birth_date, height_cm, current_weight_kg, goal")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Errore DB: " + error.message);
      setClients([]);
    } else {
      setClients(data || []);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setBirthDate("");
    setHeightCm("");
    setWeightKg("");
    setGoal("");
  };

  const openModal = () => {
    resetForm();
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
  };

  const createAthlete = async (e) => {
    e?.preventDefault?.();

    const name = (fullName || "").trim();
    if (!name) {
      alert("Inserisci almeno il nome e cognome.");
      return;
    }

    // numeric parsing pulito
    const h = String(heightCm || "").trim();
    const w = String(weightKg || "").trim();

    const payload = {
      full_name: name,
      email: String(email || "").trim() || null,
      phone: String(phone || "").trim() || null,
      birth_date: birthDate || null,
      height_cm: h ? Number(h) : null,
      current_weight_kg: w ? Number(w) : null,
      goal: String(goal || "").trim() || null,
    };

    // validazioni minime
    if (h && (Number.isNaN(payload.height_cm) || payload.height_cm <= 0)) {
      alert("Altezza non valida.");
      return;
    }
    if (w && (Number.isNaN(payload.current_weight_kg) || payload.current_weight_kg <= 0)) {
      alert("Peso non valido.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("clients").insert([payload]);
    setSaving(false);

    if (error) {
      alert("Errore DB: " + error.message);
      return;
    }

    closeModal();
    fetchData();
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
      {/* TOP BAR */}
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
          {/* NUOVO TASTO: non più + flottante */}
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-500 transition text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow"
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

      {/* LISTA */}
      <div className="max-w-2xl mx-auto p-6">
        {clients.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p>Nessun atleta trovato.</p>
            <p className="text-sm">Clicca “Aggiungi atleta” per iniziare.</p>
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

                      {/* info secondarie */}
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(client.email || client.phone) ? (client.email || client.phone) : "—"}
                        {"  ·  "}
                        {client.current_weight_kg ? `${client.current_weight_kg} kg` : "peso —"}
                        {"  ·  "}
                        {client.height_cm ? `${client.height_cm} cm` : "altezza —"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-slate-200">
              <div>
                <div className="text-sm font-bold text-slate-900">Nuovo atleta</div>
                <div className="text-xs text-slate-500">Inserisci i dati base. Puoi modificarli dopo.</div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createAthlete} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">Nome e cognome *</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Es. Mario Rossi"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="mario@email.it"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Telefono</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="+39..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Data di nascita</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Altezza (cm)</label>
                  <input
                    inputMode="numeric"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="180"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Peso attuale (kg)</label>
                  <input
                    inputMode="decimal"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="82.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Obiettivo</label>
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Es. Dimagrimento / Forza / Massa..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-slate-200 rounded-xl py-3 font-bold text-slate-600 hover:bg-slate-50"
                  disabled={saving}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 text-white rounded-xl py-3 font-bold hover:bg-black disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Salvataggio..." : "Crea atleta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
