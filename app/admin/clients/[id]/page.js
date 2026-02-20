"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import nextDynamic from "next/dynamic";

// ✅ PATH GIUSTO: app/admin/clients/[id] -> app/components
const ExerciseCharts = nextDynamic(() => import("../../components/ExerciseCharts"), {
  ssr: false,
});

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
  User,
  ClipboardList,
  Ruler,
  Calendar,
  History,
  X,
  FileText,
  AlertTriangle,
  ChevronDown,
  BarChart3,
  StickyNote,
} from "lucide-react";

// --- SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- UI ---
const TabBtn = ({ id, activeTab, onClick, icon: Icon, label }) => {
  const active = activeTab === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all duration-200 border ${
        active
          ? "bg-slate-900 text-white border-slate-900 shadow-lg transform scale-105"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
      }`}
      type="button"
    >
      <Icon size={16} />
      {label}
    </button>
  );
};

const SectionTitle = ({ icon: Icon, title }) => (
  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
    <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
      <Icon size={18} />
    </div>
    {title}
  </h3>
);

const MeasureInput = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      {label}
    </label>
    <div className="relative group">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:font-normal placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium group-focus-within:text-blue-500">
        cm
      </span>
    </div>
  </div>
);

// --- Helpers ---
const toNum = (v) => {
  const t = String(v ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const splitDashNums = (dashStr) => {
  // "10-8-8" => [10,8,8]
  return String(dashStr ?? "")
    .split("-")
    .map((x) => toNum(x))
    .filter((x) => x !== null);
};

const dateKey = (isoOrDate) => {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const ddmmyyyy = (isoOrDate) => {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT");
};

const ddmm = (isoOrDate) => {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
};

// Espande 1 log (1 esercizio) in N eventi (1 riga = 1 set)
const expandLogToEvents = (log) => {
  const repsArr = splitDashNums(log.actual_reps);
  const kgArr = splitDashNums(log.actual_weight);

  // ✅ pt_metrics sempre oggetto, mai null (così possiamo gestire parametri dinamici senza placeholder)
  const ptMetrics =
    log.pt_metrics && typeof log.pt_metrics === "object" ? log.pt_metrics : {};

  // ✅ RPE target PT: prima colonna pt_rpe, poi fallback su pt_metrics
  const ptRpe =
    toNum(log.pt_rpe) ??
    toNum(ptMetrics?.target_rpe) ??
    toNum(ptMetrics?.pt_rpe) ??
    toNum(ptMetrics?.rpe) ??
    null;

  // target kg/reps (se li metterai nel pt_metrics)
  const ptTargetKg = toNum(ptMetrics?.target_kg) ?? toNum(ptMetrics?.target_load) ?? null;
  const ptTargetReps = toNum(ptMetrics?.target_reps) ?? null;

  const sets = Math.max(toNum(log.actual_sets) ?? 0, repsArr.length, kgArr.length);

  const out = [];
  for (let i = 0; i < sets; i++) {
    out.push({
      event_id: `${log.id}__${i + 1}`,
      base_log_id: log.id,
      created_at: log.created_at,
      date_label: ddmmyyyy(log.created_at),
      date_key: dateKey(log.created_at),
      day_label: log.day_label || "",
      exercise_name: String(log.exercise_name || "").trim(),
      set_index: i + 1,
      reps: repsArr[i] ?? null,
      kg: kgArr[i] ?? null,

      // atleta RPE (colonna rpe del log)
      rpe: toNum(log.rpe),

      // PT target RPE (target di scheda)
      pt_rpe: ptRpe,

      // target opzionali
      pt_target_kg: ptTargetKg,
      pt_target_reps: ptTargetReps,

      // ✅ parametri dinamici del PT (solo se inseriti nel DB)
      pt_metrics: ptMetrics,

      athlete_notes: log.athlete_notes || "",
      pt_notes: log.pt_notes || "",
      completed: !!log.completed,
    });
  }
  return out;
};

// --- PAGE ---
export default function ClientPage({ params }) {
  const { id } = use(params);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const activeTab = searchParams.get("tab") || "profile";

  const setActiveTab = (tab) => {
    const p = new URLSearchParams(searchParams);
    p.set("tab", tab);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  // Data
  const [client, setClient] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [bodyMeasuresHistory, setBodyMeasuresHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile
  const [profile, setProfile] = useState({
    full_name: "",
    gender: "F",
    email: "",
    phone: "",
    birth_date: "",
    height_cm: "",
    current_weight_kg: "",
    goal: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Weight
  const [newWeight, setNewWeight] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);

  // Body measures
  const [bodyForm, setBodyForm] = useState({
    neck: "",
    chest: "",
    waist: "",
    hips: "",
    thigh: "",
    arm: "",
    calf: "",
  });
  const [savingBody, setSavingBody] = useState(false);

  // Create program
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [cpTitle, setCpTitle] = useState("");
  const [cpDuration, setCpDuration] = useState(4);
  const [cpNotes, setCpNotes] = useState("");
  const [creatingProgram, setCreatingProgram] = useState(false);

  // Log UI
  const [openExercise, setOpenExercise] = useState({}); // { "Squat__GiornoA": true }

  useEffect(() => {
    if (id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientRes, programsRes, metricsRes, measuresRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase
          .from("programs")
          .select("*")
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("client_metrics")
          .select("*")
          .eq("client_id", id)
          .order("measured_at", { ascending: false })
          .limit(10),
        supabase
          .from("client_measurements")
          .select("*")
          .eq("client_id", id)
          .order("measured_at", { ascending: false })
          .limit(10),
      ]);

      if (clientRes.data) {
        setClient(clientRes.data);
        setProfile({
          full_name: clientRes.data.full_name || "",
          gender: clientRes.data.gender || "F",
          email: clientRes.data.email || "",
          phone: clientRes.data.phone || "",
          birth_date: clientRes.data.birth_date || "",
          height_cm: clientRes.data.height_cm ?? "",
          current_weight_kg: clientRes.data.current_weight_kg ?? "",
          goal: clientRes.data.goal || "",
        });
      }

      const progData = programsRes.data || [];
      setPrograms(progData);

      if (progData.length > 0) {
        const progIds = progData.map((p) => p.id);

        const { data: simpleLogs } = await supabase
          .from("workout_logs")
          .select("*")
          .in("program_id", progIds)
          .order("created_at", { ascending: true }) // dal più vecchio al più recente
          .limit(3000);

        setRecentLogs(simpleLogs || []);
      } else {
        setRecentLogs([]);
      }

      setMetrics(metricsRes.data || []);
      setBodyMeasuresHistory(measuresRes.data || []);
    } catch (error) {
      console.error("Errore caricamento dati:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkExpired = (p) => {
    if (!p.created_at || !p.duration) return false;
    const start = new Date(p.created_at);
    const end = new Date(start);
    end.setDate(start.getDate() + p.duration * 7);
    return new Date() > end;
  };

  const saveProfile = async () => {
    if (!profile.full_name.trim()) return alert("Nome obbligatorio.");
    setSavingProfile(true);
    await supabase
      .from("clients")
      .update({
        full_name: profile.full_name,
        gender: profile.gender,
        email: profile.email,
        phone: profile.phone,
        birth_date: profile.birth_date || null,
        height_cm: profile.height_cm ? Number(profile.height_cm) : null,
        goal: profile.goal,
      })
      .eq("id", id);
    setSavingProfile(false);
    fetchData();
  };

  const addWeight = async () => {
    const w = Number(String(newWeight).replace(",", "."));
    if (!w || w <= 0) return alert("Peso non valido");
    setSavingWeight(true);
    await supabase.from("client_metrics").insert([{ client_id: id, weight_kg: w }]);
    await supabase.from("clients").update({ current_weight_kg: w }).eq("id", id);
    setSavingWeight(false);
    setNewWeight("");
    fetchData();
  };

  const saveBodyMeasures = async () => {
    if (!Object.values(bodyForm).some((val) => val !== "")) return alert("Inserisci almeno un dato.");
    setSavingBody(true);
    await supabase.from("client_measurements").insert([
      {
        client_id: id,
        neck_cm: bodyForm.neck || null,
        chest_cm: bodyForm.chest || null,
        waist_cm: bodyForm.waist || null,
        hips_cm: bodyForm.hips || null,
        thigh_cm: bodyForm.thigh || null,
        arm_cm: bodyForm.arm || null,
        calf_cm: bodyForm.calf || null,
      },
    ]);
    setBodyForm({ neck: "", chest: "", waist: "", hips: "", thigh: "", arm: "", calf: "" });
    setSavingBody(false);
    fetchData();
  };

  const createProgram = async () => {
    if (!cpTitle.trim()) return alert("Nome scheda obbligatorio");
    setCreatingProgram(true);

    const { data: u } = await supabase.auth.getUser();
    const user = u?.user;

    let coachName = "Coach";
    if (user) {
      const meta = user.user_metadata || {};
      if (meta.full_name) coachName = meta.full_name;
      else if (meta.name) coachName = meta.name;
      else if (meta.first_name) coachName = `${meta.first_name} ${meta.last_name || ""}`.trim();
      else if (user.email) coachName = user.email.split("@")[0];
    }

    const { data, error } = await supabase
      .from("programs")
      .insert([
        {
          client_id: id,
          title: cpTitle,
          coach_name: coachName,
          duration: Number(cpDuration),
          notes: cpNotes || null,
        },
      ])
      .select()
      .single();

    if (data) {
      setShowCreateProgram(false);
      setCpTitle("");
      setCpDuration(4);
      setCpNotes("");
      router.push(`/admin/editor/${data.id}`);
    } else {
      alert(error?.message || "Errore creazione scheda");
      setCreatingProgram(false);
    }
  };

  const deleteProgram = async (pid) => {
    if (confirm("Sei sicuro di voler eliminare questa scheda?")) {
      await supabase.from("programs").delete().eq("id", pid);
      fetchData();
    }
  };

  const copyLink = (pid) => {
    const link = `${window.location.origin}/live/${pid}`;
    if (navigator.share) navigator.share({ title: "Scheda Allenamento", url: link });
    else {
      navigator.clipboard.writeText(link);
      alert("Link copiato negli appunti!");
    }
  };

  // ==========================
  // LOG ATTIVITÀ: per esercizio
  // ==========================

  // 1) espandiamo ogni log in eventi (1 evento = 1 set)
  const expandedEvents = useMemo(() => {
    const out = [];
    (recentLogs || []).forEach((log) => {
      const name = String(log.exercise_name || "").trim();
      if (!name) return;
      out.push(...expandLogToEvents(log));
    });

    out.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (ta !== tb) return ta - tb;
      return (a.set_index || 0) - (b.set_index || 0);
    });

    return out;
  }, [recentLogs]);

  // 2) raggruppiamo per esercizio + day_label
  const exerciseGroups = useMemo(() => {
    const map = new Map();
    expandedEvents.forEach((ev) => {
      const key = `${ev.exercise_name}__${ev.day_label || ""}`;
      const cur = map.get(key) || {
        key,
        exercise_name: ev.exercise_name,
        day_label: ev.day_label || "",
        events: [],
      };
      cur.events.push(ev);
      map.set(key, cur);
    });

    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      const da = (a.day_label || "").localeCompare(b.day_label || "", "it");
      if (da !== 0) return da;
      return a.exercise_name.localeCompare(b.exercise_name, "it");
    });

    return groups;
  }, [expandedEvents]);

  // 3) punti grafico: 1 punto = 1 set
  const buildChartPoints = (group) => {
    return (group.events || []).map((ev) => {
      // ✅ includiamo eventuali metriche PT numeriche (senza placeholder: solo se davvero numeriche)
      const extraNumericPt = Object.fromEntries(
        Object.entries(ev.pt_metrics || {})
          .map(([k, v]) => [k, toNum(v)])
          .filter(([_, v]) => v !== null)
      );

      return {
        label: `${ddmm(ev.created_at)} S${ev.set_index}`, // ✅ label usata dal grafico
        reps: ev.reps ?? null,
        kg: ev.kg ?? null,
        rpe: ev.rpe ?? null,
        pt_rpe: ev.pt_rpe ?? null,
        pt_target_kg: ev.pt_target_kg ?? null,
        pt_target_reps: ev.pt_target_reps ?? null,

        // ⚠️ ExerciseCharts probabilmente ignora queste chiavi se non supportate.
        // Le includiamo per coerenza dati e futura estensione.
        ...extraNumericPt,
      };
    });
  };

  const toggleOpen = (key) => setOpenExercise((s) => ({ ...s, [key]: !s[key] }));

  // ========= RENDER =========

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 font-medium">
        Caricamento dati atleta...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* HEADER STICKY */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between min-h-[48px]">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500"
                type="button"
              >
                <ArrowLeft size={22} />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase leading-none">
                  {client?.full_name}
                </h1>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Atleta
                </span>
              </div>
            </div>

            {activeTab === "programs" && (
              <button
                onClick={() => setShowCreateProgram(true)}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black transition transform active:scale-95 text-sm"
                type="button"
              >
                <Plus size={18} /> <span className="hidden sm:inline">Nuova Scheda</span>
              </button>
            )}
          </div>

          <div className="flex gap-2 mt-6 overflow-x-auto no-scrollbar pb-1">
            <TabBtn id="profile" activeTab={activeTab} onClick={setActiveTab} icon={User} label="Profilo & Misure" />
            <TabBtn id="programs" activeTab={activeTab} onClick={setActiveTab} icon={Dumbbell} label="Schede" />
            <TabBtn id="activity" activeTab={activeTab} onClick={setActiveTab} icon={Activity} label="Log Attività" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* --- TAB PROFILO --- */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="xl:col-span-1 space-y-6">
              {/* Dati Anagrafici */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <SectionTitle icon={User} title="Dati Anagrafici" />
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                    <input
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500"
                      placeholder="Nome e cognome"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Sesso</label>
                      <select
                        value={profile.gender}
                        onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-700 bg-white"
                      >
                        <option value="F">Femmina</option>
                        <option value="M">Maschio</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Altezza (cm)</label>
                      <input
                        type="number"
                        value={profile.height_cm}
                        onChange={(e) => setProfile({ ...profile, height_cm: e.target.value })}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                    <input
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-500"
                      placeholder="email@..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Obiettivo</label>
                    <textarea
                      rows={3}
                      value={profile.goal}
                      onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-500 resize-none"
                      placeholder="es. dimagrimento, performance, ipertrofia..."
                    />
                  </div>

                  <button
                    onClick={saveProfile}
                    disabled={savingProfile}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition mt-2 disabled:opacity-50 flex justify-center items-center gap-2"
                    type="button"
                  >
                    <Save size={18} /> {savingProfile ? "Salvataggio..." : "Salva Modifiche"}
                  </button>
                </div>
              </div>

              {/* Peso */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <SectionTitle icon={Scale} title="Peso Corporeo" />
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    placeholder="kg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-lg outline-none focus:bg-white focus:border-blue-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                  />
                  <button
                    onClick={addWeight}
                    disabled={savingWeight}
                    className="bg-blue-600 text-white px-5 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
                    type="button"
                    title="Aggiungi peso"
                  >
                    <Plus />
                  </button>
                </div>

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                  {metrics.map((m) => (
                    <div
                      key={m.id}
                      className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <span className="font-bold text-slate-700">{m.weight_kg} kg</span>
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <Calendar size={12} /> {new Date(m.measured_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {metrics.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-2">Nessun peso registrato.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="xl:col-span-2 space-y-6">
              {/* Nuova Misurazione */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                  <SectionTitle icon={Ruler} title="Nuova Misurazione" />
                  <button
                    onClick={saveBodyMeasures}
                    disabled={savingBody}
                    className="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition"
                    type="button"
                  >
                    {savingBody ? "Salvataggio..." : "REGISTRA MISURE"}
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
                  <MeasureInput label="Collo" placeholder="0" value={bodyForm.neck} onChange={(v) => setBodyForm({ ...bodyForm, neck: v })} />
                  <MeasureInput label="Petto" placeholder="0" value={bodyForm.chest} onChange={(v) => setBodyForm({ ...bodyForm, chest: v })} />
                  <MeasureInput label="Braccio" placeholder="0" value={bodyForm.arm} onChange={(v) => setBodyForm({ ...bodyForm, arm: v })} />
                  <MeasureInput label="Vita" placeholder="0" value={bodyForm.waist} onChange={(v) => setBodyForm({ ...bodyForm, waist: v })} />
                  <MeasureInput label="Fianchi" placeholder="0" value={bodyForm.hips} onChange={(v) => setBodyForm({ ...bodyForm, hips: v })} />
                  <MeasureInput label="Coscia" placeholder="0" value={bodyForm.thigh} onChange={(v) => setBodyForm({ ...bodyForm, thigh: v })} />
                  <MeasureInput label="Polpaccio" placeholder="0" value={bodyForm.calf} onChange={(v) => setBodyForm({ ...bodyForm, calf: v })} />
                </div>
              </div>

              {/* Storico */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <SectionTitle icon={History} title="Storico Circonferenze" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 bg-slate-50/50">
                      <tr>
                        <th className="py-3 pl-3 rounded-tl-xl">Data</th>
                        <th className="py-3">Collo</th>
                        <th className="py-3">Petto</th>
                        <th className="py-3">Braccio</th>
                        <th className="py-3">Vita</th>
                        <th className="py-3">Fianchi</th>
                        <th className="py-3">Coscia</th>
                        <th className="py-3 rounded-tr-xl">Polpaccio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bodyMeasuresHistory.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-6 text-center text-slate-400 italic">
                            Nessuna misurazione salvata.
                          </td>
                        </tr>
                      ) : (
                        bodyMeasuresHistory.map((bm) => (
                          <tr key={bm.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 pl-3 font-bold text-slate-700">
                              {new Date(bm.measured_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-slate-600 font-mono">{bm.neck_cm || "-"}</td>
                            <td className="py-3 text-slate-600 font-mono">{bm.chest_cm || "-"}</td>
                            <td className="py-3 text-slate-600 font-mono">{bm.arm_cm || "-"}</td>
                            <td className="py-3 text-slate-600 font-mono">{bm.waist_cm || "-"}</td>
                            <td className="py-3 text-slate-600 font-mono">{bm.hips_cm || "-"}</td>
                            <td className="py-3 text-slate-600 font-mono">{bm.thigh_cm || "-"}</td>
                            <td className="py-3 text-slate-600 font-mono">{bm.calf_cm || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB SCHEDE --- */}
        {activeTab === "programs" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {programs.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <Dumbbell size={32} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Nessuna scheda attiva</h3>
                <p className="text-slate-500 text-sm mb-6">Inizia creando il primo programma di allenamento.</p>
                <button
                  onClick={() => setShowCreateProgram(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
                  type="button"
                >
                  Crea Scheda Ora
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {programs.map((p) => {
                  const isExpired = checkExpired(p);
                  return (
                    <div
                      key={p.id}
                      className={`bg-white p-6 rounded-2xl border shadow-sm transition-all group flex flex-col md:flex-row justify-between items-start gap-4 ${
                        isExpired ? "border-red-200 bg-red-50/10" : "border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="w-full">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-xl text-slate-900">{p.title}</h3>
                          {isExpired ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold uppercase rounded-md tracking-wider border border-red-200 flex items-center gap-1">
                              <AlertTriangle size={10} /> SCADUTA
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-md tracking-wider">
                              Attiva
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mb-3">
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> {p.duration} Settimane
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} /> {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {p.notes && (
                          <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 flex gap-2 items-start">
                            <FileText size={16} className="text-slate-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-slate-600 italic">"{p.notes}"</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 w-full md:w-auto mt-auto">
                          <button
                            onClick={() => router.push(`/admin/editor/${p.id}`)}
                            className="flex-1 md:flex-none py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition"
                            type="button"
                          >
                            MODIFICA
                          </button>
                          <button
                            onClick={() => window.open(`/live/${p.id}`, "_blank")}
                            className="flex-1 md:flex-none py-2.5 px-4 bg-green-50 text-green-600 font-bold rounded-xl text-xs hover:bg-green-100 transition flex items-center justify-center gap-2"
                            type="button"
                          >
                            <ExternalLink size={16} /> LIVE
                          </button>
                          <button
                            onClick={() => copyLink(p.id)}
                            className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition"
                            type="button"
                            title="Condividi Link"
                          >
                            <Share2 size={20} />
                          </button>
                          <button
                            onClick={() => deleteProgram(p.id)}
                            className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                            type="button"
                            title="Elimina Scheda"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- TAB ATTIVITÀ --- */}
        {activeTab === "activity" && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SectionTitle icon={ClipboardList} title="Log Attività (per esercizio)" />

            {exerciseGroups.length === 0 ? (
              <p className="text-slate-400 text-sm italic text-center py-10">Nessun log registrato finora.</p>
            ) : (
              <div className="space-y-4">
                {exerciseGroups.map((g) => {
                  const isOpen = !!openExercise[g.key];
                  const pts = buildChartPoints(g);

                  const rows = g.events.length;
                  const last = g.events[g.events.length - 1];

                  const hasAnyRpe = g.events.some((e) => toNum(e.rpe) !== null);
                  const hasAnyPtRpe = g.events.some((e) => toNum(e.pt_rpe) !== null);

                  // ✅ parametri PT "accensi" = presenti e numerici almeno una volta
                  const activePtParams = Array.from(
                    new Set(
                      g.events.flatMap((e) =>
                        Object.entries(e.pt_metrics || {})
                          .filter(([_, v]) => toNum(v) !== null)
                          .map(([k]) => k)
                      )
                    )
                  );

                  return (
                    <div key={g.key} className="border border-slate-200 rounded-2xl overflow-hidden">
                      {/* header */}
                      <button
                        type="button"
                        onClick={() => toggleOpen(g.key)}
                        className="w-full bg-white hover:bg-slate-50 transition px-5 py-4 flex items-center justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-xl bg-slate-100 text-slate-700">
                            <BarChart3 size={18} />
                          </div>
                          <div className="text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-black text-slate-900 text-lg">{g.exercise_name}</div>

                              {g.day_label ? (
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-600">
                                  {g.day_label}
                                </span>
                              ) : null}

                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600">
                                {rows} righe
                              </span>

                              {hasAnyRpe ? (
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600">
                                  RPE
                                </span>
                              ) : null}

                              {hasAnyPtRpe ? (
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600">
                                  PT_RPE
                                </span>
                              ) : null}

                              {activePtParams.map((param) => (
                                <span
                                  key={param}
                                  className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600"
                                >
                                  {param}
                                </span>
                              ))}
                            </div>

                            <div className="text-xs text-slate-500 mt-1">
                              Eventi dal più vecchio al più recente (1 riga = 1 set). Ultimo:{" "}
                              <span className="font-bold text-slate-700">{last?.date_label || "-"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="text-xs font-black px-3 py-2 rounded-xl border border-slate-200 bg-white">
                            {isOpen ? "Chiudi" : "Apri"}
                          </span>
                          <ChevronDown className={`transition ${isOpen ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {/* body */}
                      {isOpen && (
                        <div className="bg-slate-50/40 px-5 py-5 space-y-4">
                          {/* charts */}
                          <div className="bg-white rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
                              <BarChart3 size={14} /> Grafici (reps/kg per set, ordine cronologico)
                            </div>

                            <ExerciseCharts data={pts} showPtRpe={true} showAthleteRpe={true} showTargets={true} />
                          </div>

                          {/* events table */}
                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                              <Calendar size={14} className="text-slate-500" />
                              <div className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                Eventi (1 riga = 1 set)
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="text-[10px] text-slate-400 uppercase font-black bg-slate-50/60 border-b border-slate-100">
                                  <tr>
                                    <th className="py-3 px-4 text-left">Data</th>
                                    <th className="py-3 px-4 text-left">Set</th>
                                    <th className="py-3 px-4 text-left">Reps</th>
                                    <th className="py-3 px-4 text-left">Kg</th>
                                    <th className="py-3 px-4 text-left">RPE</th>
                                    <th className="py-3 px-4 text-left">PT_RPE</th>
                                    {activePtParams.map((param) => (
                                      <th key={param} className="py-3 px-4 text-left">
                                        {param.toUpperCase()}
                                      </th>
                                    ))}
                                    <th className="py-3 px-4 text-left">Note</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {g.events.map((ev) => (
                                    <tr key={ev.event_id} className="hover:bg-slate-50 transition">
                                      <td className="py-3 px-4 font-bold text-slate-700 whitespace-nowrap">
                                        {ev.date_label}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="px-2 py-1 rounded-md text-[11px] font-black bg-slate-900 text-white">
                                          SET {ev.set_index}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                        {ev.reps ?? "-"}
                                      </td>
                                      <td className="py-3 px-4 font-mono font-bold text-green-700">
                                        {ev.kg ?? "-"} {ev.kg !== null ? "kg" : ""}
                                      </td>
                                      <td className="py-3 px-4 font-mono text-slate-700">{ev.rpe ?? "-"}</td>
                                      <td className="py-3 px-4 font-mono text-slate-700">{ev.pt_rpe ?? "-"}</td>

                                      {activePtParams.map((param) => (
                                        <td key={param} className="py-3 px-4 font-mono text-slate-700">
                                          {ev.pt_metrics?.[param] ?? "-"}
                                        </td>
                                      ))}

                                      <td className="py-3 px-4 text-slate-600">
                                        <div className="flex flex-col gap-1">
                                          {ev.athlete_notes ? (
                                            <div className="text-xs flex items-start gap-2">
                                              <StickyNote size={14} className="text-slate-400 mt-0.5" />
                                              <span>
                                                <span className="font-bold text-slate-700">Atleta:</span>{" "}
                                                {ev.athlete_notes}
                                              </span>
                                            </div>
                                          ) : null}
                                          {ev.pt_notes ? (
                                            <div className="text-xs flex items-start gap-2">
                                              <StickyNote size={14} className="text-slate-400 mt-0.5" />
                                              <span>
                                                <span className="font-bold text-slate-700">PT:</span> {ev.pt_notes}
                                              </span>
                                            </div>
                                          ) : !ev.athlete_notes ? (
                                            <span className="text-xs text-slate-300">-</span>
                                          ) : null}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALE NUOVA SCHEDA */}
      {showCreateProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Nuova Scheda</h2>
                <p className="text-xs text-slate-500 font-medium">Assegna un nuovo programma</p>
              </div>
              <button
                onClick={() => setShowCreateProgram(false)}
                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Nome Programma
                </label>
                <input
                  autoFocus
                  value={cpTitle}
                  onChange={(e) => setCpTitle(e.target.value)}
                  placeholder="Es. Ipertrofia Base"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-lg outline-none focus:border-blue-500 focus:bg-white transition placeholder:font-normal"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Durata (Settimane)
                </label>
                <input
                  type="number"
                  value={cpDuration}
                  onChange={(e) => setCpDuration(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-lg outline-none focus:border-blue-500 focus:bg-white transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Note Generali Scheda
                </label>
                <textarea
                  value={cpNotes}
                  onChange={(e) => setCpNotes(e.target.value)}
                  placeholder="Es. Focus sull'intensità..."
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition resize-none h-20"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={createProgram}
                  disabled={creatingProgram}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition shadow-lg shadow-slate-300 disabled:opacity-50 flex justify-center gap-2"
                  type="button"
                >
                  {creatingProgram ? (
                    "Creazione..."
                  ) : (
                    <>
                      <Plus size={20} /> Crea Scheda
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
