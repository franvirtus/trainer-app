"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr"; // <--- CAMBIAMENTO FONDAMENTALE
import { useRouter } from "next/navigation";
import { Users, ChevronRight, LogOut, User, Plus, Trash2, X } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();

  // --- CONNESSIONE SICURA (Usa le variabili d'ambiente come il Login) ---
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [clients, setClients] = useState([]);
  const [trainerName, setTrainerName] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal: nuovo atleta
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    gender: "F",
    email: "",
    phone: "",
    birth_date: "",
    height_cm: "",
    current_weight_kg: "",
    goal: "",
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // 1. Verifica utente loggato
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr || !user) {
      router.push("/login"); // Se non sei loggato, ti rimanda via
      return;
    }

    setTrainerName(user.user_metadata?.first_name || user.email.split("@")[0]);

    // 2. Scarica i clienti
    const { data, error } = await supabase
      .from("clients")
      .select(
        "id, created_at, full_name, email, phone, birth_date, height_cm, current_weight_kg, goal, is_active"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Errore fetch:", error);
      // Non mostriamo alert per ogni errore di rete, meglio un log o un toast
    } else {
      setClients(data || []);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh(); // Pulisce la cache della rotta
    router.push("/login");
  };

  const openCreate = () => {
    setForm({
      full_name: "",
      gender: "F",
      email: "",
      phone: "",
      birth_date: "",
      height_cm: "",
      current_weight_kg: "",
      goal: "",
    });
    setShowCreate(true);
  };

  const closeCreate = () => {
    setShowCreate(false);
  };

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const createAthlete = async () => {
    const fullName = (form.full_name || "").trim();
    if (!fullName) {
      alert("Inserisci Nome e cognome.");
      return;
    }

    const payload = {
      full_name: fullName,
      gender: form.gender || null,
      email: (form.email || "").trim() || null,
      phone: (form.phone || "").trim() || null,
      birth_date: form.birth_date || null,
      height_cm: form.height_cm !== "" ? Number(form.height_cm) : null,
      current_weight_kg: form.current_weight_kg !== "" ? Number(form.current_weight_kg) : null,
      goal: (form.goal || "").trim() || null,
      is_active: true,
    };

    const { error } = await supabase.from("clients").insert([payload]);

    if (error) {
      alert("Errore creazione: " + error.message);
      return;
    }

    setShowCreate(false);
    fetchData(); // Ricarica la lista
  };

  const deactivateClient = async (clientId, displayName) => {
    if (!confirm(`Vuoi eliminare (disattivare) "${displayName}"?`)) return;

    const { error } = await supabase.from("clients").update({ is_active: false }).eq("id", clientId);

    if (error) alert("Errore eliminazione: " + error.message);
    else fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 bg-slate-50 gap-4">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <p className="font-bold text-sm">Caricamento atleti...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
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
            className="bg-blue-600 hover:bg-blue-500 transition text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/50"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Aggiungi</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-2 bg-slate-800 rounded-full hover:bg-red-500 hover:text-white transition text-slate-400"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-2xl mx-auto p-6">
        {clients.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Users size={48} className="mx-auto mb-4 opacity-20"/>
            <p className="font-medium">Nessun atleta trovato.</p>
            <p className="text-sm mt-2">Premi il tasto "+" in alto per iniziare.</p>
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
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {initial}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 leading-tight">{displayName}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-slate-400 mt-1">
                         {(client.email || client.phone) && (
                            <span>{client.email || client.phone}</span>
                         )}
                         {client.goal && (
                            <span className="hidden sm:inline">• {client.goal}</span>
                         )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deactivateClient(client.id, displayName);
                      }}
                      className="p-2 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition"
                      title="Archivia atleta"
                    >
                      <Trash2 size={18} />
                    </button>

                    <ChevronRight className="text-slate-300 group-hover:text-blue-600 transition" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL CREA ATLETA */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={closeCreate}
          />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="text-xl font-black text-slate-900">Nuovo atleta</div>
                <div className="text-sm text-slate-500 font-medium">Inserisci i dati base per creare la scheda.</div>
              </div>
              <button
                onClick={closeCreate}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nome e cognome *
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => onChange("full_name", e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 transition font-bold text-slate-800"
                  placeholder="Es. Mario Rossi"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sesso</label>
                  <select
                    value={form.gender}
                    onChange={(e) => onChange("gender", e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 transition font-medium text-slate-700 appearance-none"
                  >
                    <option value="F">Femmina</option>
                    <option value="M">Maschio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data di nascita</label>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => onChange("birth_date", e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 transition font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => onChange("email", e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 transition font-medium text-slate-700"
                    placeholder="mario@email.it"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefono</label>
                  <input
                    value={form.phone}
                    onChange={(e) => onChange("phone", e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 transition font-medium text-slate-700"
                    placeholder="+39..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Altezza (cm)</label>
                  <input
                    inputMode="numeric"
                    value={form.height_cm}
                    onChange={(e) => onChange("height_cm", e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 transition font-medium text-slate-700"
                    placeholder="180"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Peso (kg)</label>
                  <input
                    inputMode="decimal"
                    value={form.current_weight_kg}
                    onChange={(e) => onChange("current_weight_kg", e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 transition font-medium text-slate-700"
                    placeholder="82.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Obiettivo</label>
                <input
                  value={form.goal}
                  onChange={(e) => onChange("goal", e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-blue-500 transition font-medium text-slate-700"
                  placeholder="Es. Dimagrimento / Forza..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button
                onClick={closeCreate}
                className="flex-1 px-5 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-white hover:border-slate-300 transition"
              >
                Annulla
              </button>
              <button
                onClick={createAthlete}
                className="flex-1 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-black transition shadow-lg shadow-slate-300 flex justify-center items-center gap-2"
              >
                <Plus size={18} /> Crea Atleta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}