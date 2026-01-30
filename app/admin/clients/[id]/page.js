"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Dumbbell,
  Trash2,
  ExternalLink,
  Activity,
  Clock,
  Share2,
  Save,
  Scale,
  PencilLine,
} from "lucide-react";

export default function ClientPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [client, setClient] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  // form anagrafica
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    birth_date: "",
    height_cm: "",
    current_weight_kg: "",
    goal: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // peso (storico)
  const [newWeight, setNewWeight] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    setLoading(true);

    const { data: clientData, error: cErr } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (cErr) {
      alert("Errore client: " + cErr.message);
      setLoading(false);
      return;
    }

    setClient(clientData);

    setProfile({
      full_name: clientData?.full_name || "",
      email: clientData?.email || "",
      phone: clientData?.phone || "",
      birth_date: clientData?.birth_date || "",
      height_cm: clientData?.height_cm ?? "",
      current_weight_kg: clientData?.current_weight_kg ?? "",
      goal: clientData?.goal || "",
    });

    const { data: programsData } = await supabase
      .from("programs")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false });

    setPrograms(programsData || []);

    if (programsData && programsData.length > 0) {
      const progIds = programsData.map((p) => p.id);
      const { data: simpleLogs } = await supabase
        .from("workout_logs")
        .select("*")
        .in("program_id", progIds)
        .order("created_at", { ascending: false })
        .limit(20);
      setRecentLogs(simpleLogs || []);
    } else {
      setRecentLogs([]);
    }

    // storico peso (client_metrics)
    const { data: mData, error: mErr } = await supabase
      .from("client_metrics")
      .select("*")
      .eq("client_id", id)
      .order("measured_at", { ascending: false })
      .limit(12);

    if (mErr) {
      // non blocco la pagina se manca la tabella o RLS
      console.error(mErr);
      setMetrics([]);
    } else {
      setMetrics(mData || []);
    }

    setLoading(false);
  };

  const onProfileChange = (k, v) => setProfile((p) => ({ ...p, [k]: v }));

  const saveProfile = async () => {
    const fullName = (profile.full_name || "").trim();
    if (!fullName) {
      alert("Nome e cognome obbligatorio.");
      return;
    }

    setSavingProfile(true);

    const payload = {
      full_name: fullName,
      email: (profile.email || "").trim() || null,
      phone: (profile.phone || "").trim() || null,
      birth_date: profile.birth_date || null,
      height_cm: profile.height_cm !== "" ? Number(profile.height_cm) : null,
      current_weight_kg:
        profile.current_weight_kg !== "" ? Number(profile.current_weight_kg) : null,
      goal: (profile.goal || "").trim() || null,
    };

    const { error } = await supabase.from("clients").update(payload).eq("id", id);

    setSavingProfile(false);

    if (error) {
      alert("Errore salvataggio: " + error.message);
      return;
    }

    fetchData();
  };

  const addWeight = async () => {
    const w = String(newWeight).replace(",", ".").trim();
    if (!w) return;

    const num = Number(w);
    if (!Number.isFinite(num) || num <= 0) {
      alert("Peso non valido.");
      return;
    }

    setSavingWeight(true);

    // 1) inserisco nello storico
    const { error: insErr } = await supabase.from("client_metrics").insert([
      {
        client_id: id,
        weight_kg: num,
      },
    ]);

    if (insErr) {
      setSavingWeight(false);
      alert("Errore storico peso: " + insErr.message);
      return;
    }

    // 2) aggiorno peso corrente sul client
    const { error: updErr } = await supabase
      .from("clients")
      .update({ current_weight_kg: num })
      .eq("id", id);

    setSavingWeight(false);

    if (updErr) {
      alert("Peso salvato nello storico, ma errore aggiornando il profilo: " + updErr.message);
      setNewWeight("");
      fetchData();
      return;
    }

    setNewWeight("");
    fetchData();
  };

  const createProgram = async () => {
  const title = prompt("Nome della nuova scheda:");
  if (!title) return;

  const durationStr = prompt("Durata (settimane)?", "4");
  if (!durationStr) return;

  const duration = Number(durationStr);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 52) {
    alert("Durata non valida.");
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  let coachName = "COACH";
  if (user) {
    coachName =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "COACH";
  }

  const { data, error } = await supabase
    .from("programs")
    .insert([{ client_id: id, title, coach_name: coachName, duration }])
    .select()
    .single();

  if (error) alert("Errore: " + error.message);
  else router.push(`/admin/editor/${data.id}`);
};


  const deleteProgram = async (programId) => {
    if (!confirm("Sei sicuro di voler eliminare questa scheda?")) return;
    const { error } = await supabase.from("programs").delete().eq("id", programId);
    if (error) alert("Errore: " + error.message);
    else fetchData();
  };

  const copyLink = (programId) => {
    const link = `${window.location.origin}/live/${programId}`;
    if (navigator.share) {
      navigator
        .share({
          title: "Scheda Allenamento",
          text: "Ecco la tua nuova scheda!",
          url: link,
        })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(link);
      alert("Link copiato! Invialo all'atleta.");
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Caricamento profilo...</div>;

  const displayName = (client?.full_name || "").trim() || "Senza nome";

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* HEADER CLIENTE */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="p-2 hover:bg-slate-200 rounded-full transition"
            >
              <ArrowLeft size={24} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 uppercase">{displayName}</h1>
              <div className="text-xs text-slate-500 mt-1">
                {client?.email || client?.phone ? (
                  <span>{client?.email || client?.phone}</span>
                ) : (
                  <span className="italic">Nessun contatto salvato</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={createProgram}
            className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black transition active:scale-95"
          >
            <Plus size={20} /> NUOVA SCHEDA
          </button>
        </div>

        {/* ANAGRAFICA + PESI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PencilLine size={18} /> Anagrafica
              </h2>
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={16} /> {savingProfile ? "Salvataggio..." : "Salva"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-600">Nome e cognome *</label>
                <input
                  value={profile.full_name}
                  onChange={(e) => onProfileChange("full_name", e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Es. Mario Rossi"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Email</label>
                <input
                  value={profile.email}
                  onChange={(e) => onProfileChange("email", e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="mario@email.it"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Telefono</label>
                <input
                  value={profile.phone}
                  onChange={(e) => onProfileChange("phone", e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="+39..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Data di nascita</label>
                <input
                  type="date"
                  value={profile.birth_date || ""}
                  onChange={(e) => onProfileChange("birth_date", e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Altezza (cm)</label>
                <input
                  inputMode="numeric"
                  value={profile.height_cm}
                  onChange={(e) => onProfileChange("height_cm", e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="180"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Peso attuale (kg)</label>
                <input
                  inputMode="decimal"
                  value={profile.current_weight_kg}
                  onChange={(e) => onProfileChange("current_weight_kg", e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="82.5"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-600">Obiettivo</label>
                <input
                  value={profile.goal}
                  onChange={(e) => onProfileChange("goal", e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Dimagrimento / Forza / Massa..."
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3">
              <Scale size={18} /> Peso (storico)
            </h2>

            <div className="flex gap-2 mb-4">
              <input
                inputMode="decimal"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Es. 82.5"
              />
              <button
                onClick={addWeight}
                disabled={savingWeight}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-black transition disabled:opacity-50"
              >
                {savingWeight ? "..." : "Registra"}
              </button>
            </div>

            {metrics.length === 0 ? (
              <div className="text-sm text-slate-500 italic">Nessuna misura registrata.</div>
            ) : (
              <div className="space-y-2">
                {metrics.map((m) => (
                  <div
                    key={m.id}
                    className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  >
                    <div className="text-sm font-bold text-slate-800">{m.weight_kg} kg</div>
                    <div className="text-xs text-slate-500">
                      {new Date(m.measured_at).toLocaleDateString()}{" "}
                      {new Date(m.measured_at).toLocaleTimeString().slice(0, 5)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SCHEDE + FEED */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLONNA SCHEDE */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <Dumbbell size={20} /> Schede Allenamento
            </h2>

            {programs.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400">
                Nessuna scheda. Clicca su "Nuova Scheda".
              </div>
            ) : (
              <div className="grid gap-4">
                {programs.map((prog) => (
                  <div
                    key={prog.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-blue-400 transition-all"
                  >
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{prog.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 uppercase font-bold tracking-wide">
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                          {prog.duration} Settimane
                        </span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {new Date(prog.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => router.push(`/admin/editor/${prog.id}`)}
                        className="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition text-xs"
                      >
                        MODIFICA
                      </button>

                      <button
                        onClick={() => window.open(`/live/${prog.id}`, "_blank")}
                        className="px-3 py-2 bg-green-50 text-green-600 font-bold rounded-lg hover:bg-green-100 transition text-xs flex items-center gap-1"
                      >
                        <ExternalLink size={14} /> APRI LIVE
                      </button>

                      <button
                        onClick={() => copyLink(prog.id)}
                        className="px-3 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition text-xs flex items-center gap-1"
                      >
                        <Share2 size={14} /> CONDIVIDI
                      </button>

                      <button
                        onClick={() => deleteProgram(prog.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Elimina"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COLONNA FEED ATTIVITÀ */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <Activity size={20} className="text-green-600" /> Attività Recente
            </h2>

            <div className="bg-slate-100 rounded-2xl p-4 h-[500px] overflow-y-auto border border-slate-200 relative">
              {recentLogs.length === 0 ? (
                <div className="text-center text-slate-400 mt-10 text-sm">
                  Ancora nessun dato registrato dall'atleta.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map((log) => {
                    const reps = (log.actual_reps || "").split("-").join(", ");
                    const weights = (log.actual_weight || "").split("-").join(", ");

                    return (
                      <div
                        key={log.id}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-800 capitalize">
                            {log.exercise_name}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            {log.day_label} • W{log.week_number}
                          </span>
                        </div>
                        <div className="text-slate-600 mb-2 font-mono text-xs">
                          <div className="flex justify-between border-b border-slate-100 pb-1 mb-1">
                            <span>Reps:</span>{" "}
                            <span className="font-bold text-slate-900">{reps}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Carico:</span>{" "}
                            <span className="font-bold text-green-600">{weights} Kg</span>
                          </div>
                        </div>
                        {log.athlete_notes && (
                          <div className="bg-yellow-50 text-yellow-800 p-2 rounded-lg text-xs italic border border-yellow-100">
                            "{log.athlete_notes}"
                          </div>
                        )}
                        <div className="text-right mt-2">
                          <span className="text-[10px] text-slate-300">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
