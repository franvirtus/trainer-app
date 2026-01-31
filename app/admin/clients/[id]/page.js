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
  X,
  User,
  LayoutDashboard,
  ClipboardList,
  Ruler,
  History,
  Calendar
} from "lucide-react";

// --- COMPONENTE TAB BUTTON ---
const TabBtn = ({ id, activeTab, setActiveTab, icon: Icon, children }) => {
  const active = activeTab === id;
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition border ${
        active
          ? "bg-slate-900 text-white border-slate-900 shadow-md transform scale-105"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
      }`}
    >
      <Icon size={16} />
      {children}
    </button>
  );
};

// --- COMPONENTE INPUT MISURA ---
const MeasureInput = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:font-normal"
      />
      <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">cm</span>
    </div>
  </div>
);

export default function ClientPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  // TUA CHIAVE CORRETTA
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";

  const supabase = createClient(supabaseUrl, supabaseKey);

  // STATI DATI
  const [client, setClient] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [metrics, setMetrics] = useState([]); // Storico pesi
  const [bodyMeasuresHistory, setBodyMeasuresHistory] = useState([]); // Storico misure corpo
  const [loading, setLoading] = useState(true);

  // TAB UI
  const [activeTab, setActiveTab] = useState("overview");

  // FORM ANAGRAFICA
  const [profile, setProfile] = useState({
    full_name: "", gender: "F", email: "", phone: "",
    birth_date: "", height_cm: "", current_weight_kg: "", goal: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // FORM PESO
  const [newWeight, setNewWeight] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);

  // FORM MISURE CORPO
  const [bodyForm, setBodyForm] = useState({
    neck: "", chest: "", waist: "", hips: "",
    thigh: "", arm: "", calf: ""
  });
  const [savingBody, setSavingBody] = useState(false);

  // MODALE SCHEDA
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [cpTitle, setCpTitle] = useState("");
  const [cpDuration, setCpDuration] = useState(4);
  const [creatingProgram, setCreatingProgram] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);

    // 1. Cliente
    const { data: clientData } = await supabase.from("clients").select("*").eq("id", id).single();
    if (clientData) {
      setClient(clientData);
      setProfile({
        full_name: clientData.full_name || "",
        gender: clientData.gender || "F",
        email: clientData.email || "",
        phone: clientData.phone || "",
        birth_date: clientData.birth_date || "",
        height_cm: clientData.height_cm ?? "",
        current_weight_kg: clientData.current_weight_kg ?? "",
        goal: clientData.goal || "",
      });
    }

    // 2. Schede
    const { data: programsData } = await supabase.from("programs").select("*").eq("client_id", id).order("created_at", { ascending: false });
    setPrograms(programsData || []);

    // 3. Log Recenti
    if (programsData?.length > 0) {
      const progIds = programsData.map((p) => p.id);
      const { data: simpleLogs } = await supabase.from("workout_logs").select("*").in("program_id", progIds).order("created_at", { ascending: false }).limit(20);
      setRecentLogs(simpleLogs || []);
    }

    // 4. Storico Peso
    const { data: mData } = await supabase.from("client_metrics").select("*").eq("client_id", id).order("measured_at", { ascending: false }).limit(20);
    setMetrics(mData || []);

    // 5. Storico Misure Corporee
    const { data: bData } = await supabase.from("client_measurements").select("*").eq("client_id", id).order("measured_at", { ascending: false }).limit(10);
    setBodyMeasuresHistory(bData || []);

    setLoading(false);
  };

  // --- FUNZIONI SALVATAGGIO ---

  const saveProfile = async () => {
    const fullName = (profile.full_name || "").trim();
    if (!fullName) return alert("Nome obbligatorio.");
    setSavingProfile(true);
    
    const payload = {
      full_name: fullName,
      gender: profile.gender,
      email: profile.email,
      phone: profile.phone,
      birth_date: profile.birth_date || null,
      height_cm: profile.height_cm ? Number(profile.height_cm) : null,
      current_weight_kg: profile.current_weight_kg ? Number(profile.current_weight_kg) : null,
      goal: profile.goal
    };

    await supabase.from("clients").update(payload).eq("id", id);
    setSavingProfile(false);
    fetchData();
  };

  const addWeight = async () => {
    const w = Number(newWeight.replace(",", "."));
    if (!w || w <= 0) return alert("Peso non valido");
    setSavingWeight(true);
    
    await supabase.from("client_metrics").insert([{ client_id: id, weight_kg: w }]);
    await supabase.from("clients").update({ current_weight_kg: w }).eq("id", id);
    
    setSavingWeight(false);
    setNewWeight("");
    fetchData();
  };

  const saveBodyMeasures = async () => {
    const hasData = Object.values(bodyForm).some(val => val !== "");
    if (!hasData) return alert("Inserisci almeno una misura.");
    
    setSavingBody(true);
    const payload = {
        client_id: id,
        neck_cm: bodyForm.neck ? Number(bodyForm.neck) : null,
        chest_cm: bodyForm.chest ? Number(bodyForm.chest) : null,
        waist_cm: bodyForm.waist ? Number(bodyForm.waist) : null,
        hips_cm: bodyForm.hips ? Number(bodyForm.hips) : null,
        thigh_cm: bodyForm.thigh ? Number(bodyForm.thigh) : null,
        arm_cm: bodyForm.arm ? Number(bodyForm.arm) : null,
        calf_cm: bodyForm.calf ? Number(bodyForm.calf) : null,
    };

    const { error } = await supabase.from("client_measurements").insert([payload]);
    if(error) alert("Errore: " + error.message);
    else {
        setBodyForm({ neck: "", chest: "", waist: "", hips: "", thigh: "", arm: "", calf: "" });
        fetchData();
    }
    setSavingBody(false);
  };

  // --- CREAZIONE SCHEDA ---
  const createProgram = async () => {
    if (!cpTitle.trim()) return alert("Nome scheda obbligatorio");
    setCreatingProgram(true);
    const { data: { user } } = await supabase.auth.getUser();
    const coachName = user?.user_metadata?.name || "COACH";
    
    const { data, error } = await supabase.from("programs").insert([{ 
        client_id: id, title: cpTitle, coach_name: coachName, duration: Number(cpDuration) 
    }]).select().single();

    if (data) router.push(`/admin/editor/${data.id}`);
    else { alert(error.message); setCreatingProgram(false); }
  };

  const deleteProgram = async (pid) => {
    if (confirm("Eliminare scheda?")) {
        await supabase.from("programs").delete().eq("id", pid);
        fetchData();
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-sans">Caricamento profilo...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/admin/dashboard")} className="p-3 hover:bg-slate-100 rounded-full transition text-slate-500">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{client?.full_name}</h1>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atleta</span>
            </div>
          </div>
          <button onClick={() => setShowCreateProgram(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl hover:bg-black transition transform active:scale-95">
            <Plus size={20} /> <span className="hidden sm:inline">Nuova Scheda</span>
          </button>
        </div>

        {/* NAVIGAZIONE TABS */}
        <div className="flex flex-wrap gap-2 sticky top-2 z-10 bg-slate-50/90 backdrop-blur py-2">
          <TabBtn id="overview" activeTab={activeTab} setActiveTab={setActiveTab} icon={LayoutDashboard}>Panoramica</TabBtn>
          <TabBtn id="measures" activeTab={activeTab} setActiveTab={setActiveTab} icon={Ruler}>Misure</TabBtn>
          <TabBtn id="programs" activeTab={activeTab} setActiveTab={setActiveTab} icon={Dumbbell}>Schede</TabBtn>
          <TabBtn id="activity" activeTab={activeTab} setActiveTab={setActiveTab} icon={Activity}>Attività</TabBtn>
          <TabBtn id="profile" activeTab={activeTab} setActiveTab={setActiveTab} icon={User}>Profilo</TabBtn>
        </div>

        {/* --- CONTENUTO TAB --- */}

        {/* 1. PANORAMICA */}
        {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="text-blue-500"/> Ultimo Allenamento</h2>
                    {recentLogs.length > 0 ? (
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                             <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-slate-900 text-lg capitalize">{recentLogs[0].exercise_name}</span>
                                <span className="text-[10px] uppercase font-bold bg-white border px-2 py-1 rounded text-slate-500">{new Date(recentLogs[0].created_at).toLocaleDateString()}</span>
                             </div>
                             <div className="flex gap-4 text-sm font-mono text-slate-600">
                                <div><span className="text-slate-400">Set:</span> {recentLogs[0].actual_sets || "-"}</div>
                                <div><span className="text-slate-400">Reps:</span> {recentLogs[0].actual_reps}</div>
                                <div><span className="text-slate-400">Kg:</span> <span className="text-green-600 font-bold">{recentLogs[0].actual_weight}</span></div>
                             </div>
                        </div>
                    ) : <p className="text-slate-400 italic">Nessuna attività recente.</p>}
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-3">
                        <Scale size={32}/>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{metrics[0]?.weight_kg || "-"} <span className="text-lg text-slate-400 font-medium">kg</span></div>
                    <div className="text-xs font-bold text-slate-400 uppercase mt-1">Peso attuale</div>
                </div>
            </div>
        )}

        {/* 2. MISURE (GRAFICA MIGLIORATA) */}
        {activeTab === "measures" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLONNA SINISTRA: PESO */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Scale size={20} className="text-blue-500"/> Peso Corporeo</h3>
                    
                    <div className="flex gap-2 mb-6">
                        <input 
                            type="number" 
                            placeholder="kg" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-lg outline-none focus:bg-white focus:border-blue-500 transition"
                            value={newWeight}
                            onChange={(e) => setNewWeight(e.target.value)}
                        />
                        <button onClick={addWeight} disabled={savingWeight} className="bg-slate-900 text-white px-5 rounded-xl font-bold hover:bg-black transition disabled:opacity-50">
                            {savingWeight ? "..." : <Plus/>}
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {metrics.map(m => (
                            <div key={m.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition bg-slate-50/50">
                                <span className="font-bold text-slate-700">{m.weight_kg} kg</span>
                                <span className="text-xs font-medium text-slate-400 flex items-center gap-1"><Calendar size={12}/> {new Date(m.measured_at).toLocaleDateString()}</span>
                            </div>
                        ))}
                        {metrics.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Nessun peso registrato.</p>}
                    </div>
                </div>
            </div>

            {/* COLONNA DESTRA: MISURE CORPOREE */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* FORM NUOVA MISURAZIONE */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Ruler size={20} className="text-indigo-500"/> Nuova Misurazione</h3>
                        <button onClick={saveBodyMeasures} disabled={savingBody} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">
                            {savingBody ? "Salvataggio..." : "SALVA MISURE"}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MeasureInput label="Collo" placeholder="0" value={bodyForm.neck} onChange={v => setBodyForm({...bodyForm, neck: v})}/>
                        <MeasureInput label="Petto" placeholder="0" value={bodyForm.chest} onChange={v => setBodyForm({...bodyForm, chest: v})}/>
                        <MeasureInput label="Braccio" placeholder="0" value={bodyForm.arm} onChange={v => setBodyForm({...bodyForm, arm: v})}/>
                        <MeasureInput label="Vita" placeholder="0" value={bodyForm.waist} onChange={v => setBodyForm({...bodyForm, waist: v})}/>
                        <MeasureInput label="Fianchi" placeholder="0" value={bodyForm.hips} onChange={v => setBodyForm({...bodyForm, hips: v})}/>
                        <MeasureInput label="Coscia" placeholder="0" value={bodyForm.thigh} onChange={v => setBodyForm({...bodyForm, thigh: v})}/>
                        <MeasureInput label="Polpaccio" placeholder="0" value={bodyForm.calf} onChange={v => setBodyForm({...bodyForm, calf: v})}/>
                    </div>
                </div>

                {/* STORICO MISURE */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><History size={20} className="text-slate-400"/> Storico Misure</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
                                <tr>
                                    <th className="py-3 pl-2">Data</th>
                                    <th className="py-3">Petto</th>
                                    <th className="py-3">Vita</th>
                                    <th className="py-3">Fianchi</th>
                                    <th className="py-3">Braccio</th>
                                    <th className="py-3">Coscia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {bodyMeasuresHistory.length === 0 ? (
                                    <tr><td colSpan="6" className="py-4 text-center text-slate-400 italic">Nessuna misurazione salvata.</td></tr>
                                ) : (
                                    bodyMeasuresHistory.map(bm => (
                                        <tr key={bm.id} className="hover:bg-slate-50 transition">
                                            <td className="py-3 pl-2 font-bold text-slate-700">{new Date(bm.measured_at).toLocaleDateString()}</td>
                                            <td className="py-3 text-slate-600">{bm.chest_cm || "-"}</td>
                                            <td className="py-3 text-slate-600">{bm.waist_cm || "-"}</td>
                                            <td className="py-3 text-slate-600">{bm.hips_cm || "-"}</td>
                                            <td className="py-3 text-slate-600">{bm.arm_cm || "-"}</td>
                                            <td className="py-3 text-slate-600">{bm.thigh_cm || "-"}</td>
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

        {/* 3. SCHEDE */}
        {activeTab === "programs" && (
            <div className="space-y-4">
                {programs.length === 0 ? <div className="text-center py-10 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300">Nessuna scheda creata.</div> : 
                 programs.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:border-blue-300 transition group">
                        <div className="w-full md:w-auto">
                            <h3 className="font-bold text-lg text-slate-800">{p.title}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{p.duration} Settimane • {new Date(p.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => router.push(`/admin/editor/${p.id}`)} className="flex-1 md:flex-none bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition">MODIFICA</button>
                            <button onClick={() => window.open(`/live/${p.id}`,'_blank')} className="flex-1 md:flex-none bg-green-50 text-green-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-100 transition flex items-center justify-center gap-1"><ExternalLink size={14}/> LIVE</button>
                            <button onClick={() => deleteProgram(p.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={18}/></button>
                        </div>
                    </div>
                 ))}
            </div>
        )}

        {/* 4. ATTIVITA */}
        {activeTab === "activity" && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-800 mb-4">Log Allenamenti Recenti</h3>
                {recentLogs.map(log => (
                    <div key={log.id} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                        <div>
                            <div className="font-bold text-slate-700 capitalize">{log.exercise_name}</div>
                            <div className="text-xs text-slate-400">{log.day_label} • {new Date(log.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                             <div className="font-mono font-bold text-slate-800">{log.actual_reps} reps</div>
                             <div className="font-mono text-xs font-bold text-green-600">{log.actual_weight} kg</div>
                        </div>
                    </div>
                ))}
                {recentLogs.length === 0 && <p className="text-slate-400 text-sm italic">Nessun log trovato.</p>}
            </div>
        )}

        {/* 5. PROFILO */}
        {activeTab === "profile" && (
             <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><User size={20}/> Modifica Anagrafica</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                        <input value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                            <input value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-800 outline-none focus:border-blue-500"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Telefono</label>
                            <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-800 outline-none focus:border-blue-500"/>
                        </div>
                    </div>
                    <button onClick={saveProfile} disabled={savingProfile} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition mt-4 disabled:opacity-50">{savingProfile ? "Salvataggio..." : "Salva Modifiche"}</button>
                </div>
             </div>
        )}

      </div>

      {/* MODALE NUOVA SCHEDA */}
      {showCreateProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-black text-slate-800">Nuova Scheda</h2>
                   <button onClick={() => setShowCreateProgram(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"><X size={20}/></button>
               </div>
               <div className="space-y-4">
                   <div>
                       <label className="text-xs font-bold text-slate-500 uppercase">Nome Programma</label>
                       <input autoFocus value={cpTitle} onChange={e => setCpTitle(e.target.value)} placeholder="Es. Ipertrofia" className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-lg outline-none focus:border-blue-500"/>
                   </div>
                   <div>
                       <label className="text-xs font-bold text-slate-500 uppercase">Durata (Settimane)</label>
                       <input type="number" value={cpDuration} onChange={e => setCpDuration(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-lg outline-none focus:border-blue-500"/>
                   </div>
                   <button onClick={createProgram} disabled={creatingProgram} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50">{creatingProgram ? "Creazione..." : "Crea Scheda"}</button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}