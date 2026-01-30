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

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr || !user) {
      router.push("/");
      return;
    }

    setTrainerName(user.user_metadata?.first_name || user.email.split("@")[0]);

    const { data, error } = await supabase
      .from("clients")
      .select(
        "id, created_at, full_name, email, phone, birth_date, height_cm, current_weight_kg, goal, is_active"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Errore DB: " + error.message);
      setClients([]);
    } else {
      setClients(data || []);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const openCreate = () => {
    setForm({
      full_name: "",
      gender:"F",
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
      alert("Errore DB: " + error.message);
      return;
    }

    setShowCreate(false);
    fetchData();
  };

  const deactivateClient = async (clientId, displayName) => {
    if (!confirm(`Vuoi eliminare (disattivare) "${displayName}"?`)) return;

    const { error } = await supabase.from("clients").update({ is_active: false }).eq("id", clientId);

    if (error) alert("Errore DB: " + error.message);
    else fetchData();
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
            className="bg-blue-600 hover:bg-blue-500 transition text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
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

      {/* BODY */}
      <div className="max-w-2xl mx-auto p-6">
        {clients.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p>Nessun atleta trovato.</p>
            <p className="text-sm">Premi “Aggiungi atleta” per iniziare.</p>
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
                        deactivateClient(client.id, displayName);
                      }}
                      className="p-2 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition"
                      title="Elimina atleta"
                      aria-label="Elimina atleta"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeCreate}
            aria-hidden="true"
          />
          <div className="relative w-[92vw] max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900">Nuovo atleta</div>
                <div className="text-sm text-slate-500">Inserisci i dati base.</div>
              </div>
              <button
                onClick={closeCreate}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Nome e cognome *
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => onChange("full_name", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="Es. Mario Rossi"
                />
              </div>


<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  <div>
    <label className="block text-sm font-bold text-slate-700 mb-1">Sesso</label>
    <select
      value={form.gender}
      onChange={(e) => onChange("gender", e.target.value)}
      className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 bg-white"
    >
      <option value="F">Femmina</option>
      <option value="M">Maschio</option>
    </select>
  </div>

  <div className="border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center p-3">
    <img
      src={form.gender === "M" ? "/body-male.png" : "/body-female.png"}
      alt="Sagoma"
      className="h-24 object-contain opacity-90"
    />
  </div>
</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => onChange("email", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="mario@email.it"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Telefono</label>
                  <input
                    value={form.phone}
                    onChange={(e) => onChange("phone", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="+39..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Data di nascita</label>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => onChange("birth_date", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Altezza (cm)</label>
                  <input
                    inputMode="numeric"
                    value={form.height_cm}
                    onChange={(e) => onChange("height_cm", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="180"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Peso attuale (kg)</label>
                  <input
                    inputMode="decimal"
                    value={form.current_weight_kg}
                    onChange={(e) => onChange("current_weight_kg", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="82.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Obiettivo</label>
                <input
                  value={form.goal}
                  onChange={(e) => onChange("goal", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="Es. Dimagrimento / Forza / Massa..."
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex gap-3 justify-end">
              <button
                onClick={closeCreate}
                className="px-5 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
              >
                Annulla
              </button>
              <button
                onClick={createAthlete}
                className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-black transition"
              >
                Crea atleta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
