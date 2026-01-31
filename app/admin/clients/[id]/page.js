"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ArrowLeft, Plus, Dumbbell, Trash2, ExternalLink, Activity, Clock, Share2, Save, Scale, User, ClipboardList, Ruler, Calendar, History, X, AlignLeft
} from "lucide-react";

// --- COMPONENTI UI ---
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
    >
      <Icon size={16} />
      {label}
    </button>
  );
};

const SectionTitle = ({ icon: Icon, title }) => (
  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
    <div className="p-2 bg-slate-100 rounded-lg text-slate-700"><Icon size={18}/></div>
    {title}
  </h3>
);

// INPUT SENZA FRECCE (CSS Tailwind custom)
const MeasureInput = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    <div className="relative group">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        // La classe [appearance:textfield]... nasconde le frecce su Chrome/Safari/Firefox
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:font-normal placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium group-focus-within:text-blue-500">cm</span>
    </div>
  </div>
);

export default function ClientPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Tab Persistente
  const activeTab = searchParams.get("tab") || "profile";
  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [client, setClient] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [bodyMeasuresHistory, setBodyMeasuresHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Stati
  const [profile, setProfile] = useState({ full_name: "", gender: "F", email: "", phone: "", birth_date: "", height_cm: "", current_weight_kg: "", goal: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [bodyForm, setBodyForm] = useState({ neck: "", chest: "", waist: "", hips: "", thigh: "", arm: "", calf: "" });
  const [savingBody, setSavingBody] = useState(false);
  
  // Modale Nuova Scheda
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [cpTitle, setCpTitle] = useState("");
  const [cpDuration, setCpDuration] = useState(4);
  const [cpNotes, setCpNotes] = useState(""); // NUOVO CAMPO NOTE
  const [creatingProgram, setCreatingProgram] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: clientData } = await supabase.from("clients").select("*").eq("id", id).single();
    if (clientData) {
      setClient(clientData);
      setProfile({
        full_name: clientData.full_name || "", gender: clientData.gender || "F", email: clientData.email || "",
        phone: clientData.phone || "", birth_date: clientData.birth_date || "",
        height_cm: clientData.height_cm ?? "", current_weight_kg: clientData.current_weight_kg ?? "", goal: clientData.goal || "",
      });
    }
    const { data: programsData } = await supabase.from("programs").select("*").eq("client_id", id).order("created_at", { ascending: false });
    setPrograms(programsData || []);
    
    if (programsData?.length > 0) {
      const progIds = programsData.map((p) => p.id);
      const { data: simpleLogs } = await supabase.from("workout_logs").select("*").in("program_id", progIds).order("created_at", { ascending: false }).limit(20);
      setRecentLogs(simpleLogs || []);
    }
    const { data: mData } = await supabase.from("client_metrics").select("*").eq("client_id", id).order("measured_at", { ascending: false }).limit(10);
    setMetrics(mData || []);
    const { data: bData } = await supabase.from("client_measurements").select("*").eq("client_id", id).order("measured_at", { ascending: false }).limit(10);
    setBodyMeasuresHistory(bData || []);
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!profile.full_name.trim()) return alert("Nome obbligatorio.");
    setSavingProfile(true);
    await supabase.from("clients").update({
      full_name: profile.full_name, gender: profile.gender, email: profile.email, phone: profile.phone,
      birth_date: profile.birth_date || null, height_cm: profile.height_cm ? Number(profile.height_cm) : null, goal: profile.goal
    }).eq("id", id);
    setSavingProfile(false); fetchData();
  };

  const addWeight = async () => {
    const w = Number(newWeight.replace(",", "."));
    if (!w || w <= 0) return alert("Peso non valido");
    setSavingWeight(true);
    await supabase.from("client_metrics").insert([{ client_id: id, weight_kg: w }]);
    await supabase.from("clients").update({ current_weight_kg: w }).eq("id", id);
    setSavingWeight(false); setNewWeight(""); fetchData();
  };

  const saveBodyMeasures = async () => {
    if (!Object.values(bodyForm).some(val => val !== "")) return alert("Inserisci dati.");
    setSavingBody(true);
    await supabase.from("client_measurements").insert([{
        client_id: id, neck_cm: bodyForm.neck || null, chest_cm: bodyForm.chest || null, waist_cm: bodyForm.waist || null,
        hips_cm: bodyForm.hips || null, thigh_cm: bodyForm.thigh || null, arm_cm: bodyForm.arm || null, calf_cm: bodyForm.calf || null,
    }]);
    setBodyForm({ neck: "", chest: "", waist: "", hips: "", thigh: "", arm: "", calf: "" });
    setSavingBody(false); fetchData();
  };

  const createProgram = async () => {
    if (!cpTitle.trim()) return alert("Nome scheda obbligatorio");
    setCreatingProgram(true);
    const { data: { user } } = await supabase.auth.getUser();
    const coachName = user?.user_metadata?.name || "COACH";
    
    // Inseriamo anche le NOTE (cpNotes)
    const { data, error } = await supabase.from("programs").insert([{ 
        client_id: id, 
        title: cpTitle, 
        coach_name: coachName, 
        duration: Number(cpDuration),
        notes: cpNotes || null 
    }]).select().single();

    if (data) {
        setShowCreateProgram(false);
        router.push(`/admin/editor/${data.id}`);
    } else {
        alert(error?.message || "Errore sconosciuto");
        setCreatingProgram(false);
    }
  };

  const deleteProgram = async (pid) => {
    if (confirm("Eliminare scheda?")) { await supabase.from("programs").delete().eq("id", pid); fetchData(); }
  };

  const copyLink = (pid) => {
    const link = `${window.location.origin}/live/${pid}`;
    if (navigator.share) navigator.share({ title: 'Scheda', url: link });
    else { navigator.clipboard.writeText(link); alert("Link copiato!"); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/admin/dashboard")} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500"><ArrowLeft size={22} /></button>
                    <div><h1 className="text-2xl font-black text-slate-900 uppercase leading-none">{client?.full_name}</h1><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Atleta</span></div>
                </div>
                <button onClick={() => setShowCreateProgram(true)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black transition transform active:scale-95 text-sm"><Plus size={18} /> <span className="hidden sm:inline">Nuova Scheda</span></button>
            </div>
            <div className="flex gap-2 mt-6 overflow-x-auto no-scrollbar pb-1">
                <TabBtn id="profile" activeTab={activeTab} onClick={setActiveTab} icon={User} label="Profilo & Misure" />
                <TabBtn id="programs" activeTab={activeTab} onClick={setActiveTab} icon={Dumbbell} label="Schede" />
                <TabBtn id="activity" activeTab={activeTab} onClick={setActiveTab} icon={Activity} label="Log Attività" />
            </div>
          </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {activeTab === "profile" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <SectionTitle icon={User} title="Dati Anagrafici" />
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label><input value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500"/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-slate-500 uppercase">Sesso</label><select value={profile.gender} onChange={e => setProfile({...profile, gender: e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-700 bg-white"><option value="F">Femmina</option><option value="M">Maschio</option></select></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase">Altezza (cm)</label><input type="number" value={profile.height_cm} onChange={e => setProfile({...profile, height_cm: e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/></div>
                            </div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Email</label><input value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-500"/></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Obiettivo</label><textarea rows={3} value={profile.goal} onChange={e => setProfile({...profile, goal: e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-500 resize-none"/></div>
                            <button onClick={saveProfile} disabled={savingProfile} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition mt-2 disabled:opacity-50 flex justify-center items-center gap-2"><Save size={18}/> {savingProfile ? "Salvataggio..." : "Salva Modifiche"}</button>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <SectionTitle icon={Scale} title="Peso Corporeo" />
                        <div className="flex gap-2 mb-4"><input type="number" placeholder="kg" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-lg outline-none focus:bg-white focus:border-blue-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} /><button onClick={addWeight} disabled={savingWeight} className="bg-blue-600 text-white px-5 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"><Plus/></button></div>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">{metrics.map(m => (<div key={m.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100"><span className="font-bold text-slate-700">{m.weight_kg} kg</span><span className="text-xs font-medium text-slate-400 flex items-center gap-1"><Calendar size={12}/> {new Date(m.measured_at).toLocaleDateString()}</span></div>))}{metrics.length === 0 && <p className="text-center text-slate-400 text-sm py-2">Nessun peso registrato.</p>}</div>
                    </div>
                </div>
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2"><SectionTitle icon={Ruler} title="Nuova Misurazione" /><button onClick={saveBodyMeasures} disabled={savingBody} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition">{savingBody ? "Salvataggio..." : "REGISTRA MISURE"}</button></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
                            <MeasureInput label="Collo" placeholder="0" value={bodyForm.neck} onChange={v => setBodyForm({...bodyForm, neck: v})}/>
                            <MeasureInput label="Petto" placeholder="0" value={bodyForm.chest} onChange={v => setBodyForm({...bodyForm, chest: v})}/>
                            <MeasureInput label="Braccio" placeholder="0" value={bodyForm.arm} onChange={v => setBodyForm({...bodyForm, arm: v})}/>
                            <MeasureInput label="Vita" placeholder="0" value={bodyForm.waist} onChange={v => setBodyForm({...bodyForm, waist: v})}/>
                            <MeasureInput label="Fianchi" placeholder="0" value={bodyForm.hips} onChange={v => setBodyForm({...bodyForm, hips: v})}/>
                            <MeasureInput label="Coscia" placeholder="0" value={bodyForm.thigh} onChange={v => setBodyForm({...bodyForm, thigh: v})}/>
                            <MeasureInput label="Polpaccio" placeholder="0" value={bodyForm.calf} onChange={v => setBodyForm({...bodyForm, calf: v})}/>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <SectionTitle icon={History} title="Storico Circonferenze" />
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left"><thead className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 bg-slate-50/50"><tr><th className="py-3 pl-3 rounded-tl-xl">Data</th><th className="py-3">Collo</th><th className="py-3">Petto</th><th className="py-3">Vita</th><th className="py-3">Fianchi</th><th className="py-3">Braccio</th><th className="py-3 rounded-tr-xl">Coscia</th></tr></thead><tbody className="divide-y divide-slate-50">{bodyMeasuresHistory.length === 0 ? (<tr><td colSpan="7" className="py-6 text-center text-slate-400 italic">Nessuna misurazione salvata.</td></tr>) : (bodyMeasuresHistory.map(bm => (<tr key={bm.id} className="hover:bg-slate-50 transition"><td className="py-3 pl-3 font-bold text-slate-700">{new Date(bm.measured_at).toLocaleDateString()}</td><td className="py-3 text-slate-600 font-mono">{bm.neck_cm || "-"}</td><td className="py-3 text-slate-600 font-mono">{bm.chest_cm || "-"}</td><td className="py-3 text-slate-600 font-mono">{bm.waist_cm || "-"}</td><td className="py-3 text-slate-600 font-mono">{bm.hips_cm || "-"}</td><td className="py-3 text-slate-600 font-mono">{bm.arm_cm || "-"}</td><td className="py-3 text-slate-600 font-mono">{bm.thigh_cm || "-"}</td></tr>)))}</tbody></table>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {activeTab === "programs" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {programs.length === 0 ? (<div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4"><Dumbbell size={32}/></div><h3 className="font-bold text-slate-800 text-lg">Nessuna scheda attiva</h3><p className="text-slate-500 text-sm mb-6">Inizia creando il primo programma di allenamento.</p><button onClick={() => setShowCreateProgram(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition">Crea Scheda Ora</button></div>) : (<div className="grid gap-4">{programs.map(p => (<div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-4"><div><div className="flex items-center gap-2 mb-1"><h3 className="font-bold text-xl text-slate-900">{p.title}</h3><span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-md tracking-wider">Attiva</span></div><div className="flex items-center gap-4 text-xs text-slate-500 font-medium"><span className="flex items-center gap-1"><Clock size={14}/> {p.duration} Settimane</span><span className="flex items-center gap-1"><Calendar size={14}/> {new Date(p.created_at).toLocaleDateString()}</span></div></div><div className="flex items-center gap-2 w-full md:w-auto"><button onClick={() => router.push(`/admin/editor/${p.id}`)} className="flex-1 md:flex-none py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition">MODIFICA</button><button onClick={() => window.open(`/live/${p.id}`,'_blank')} className="flex-1 md:flex-none py-2.5 px-4 bg-green-50 text-green-600 font-bold rounded-xl text-xs hover:bg-green-100 transition flex items-center justify-center gap-2"><ExternalLink size={16}/> LIVE</button><button onClick={() => copyLink(p.id)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition" title="Condividi Link"><Share2 size={20}/></button><button onClick={() => deleteProgram(p.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition" title="Elimina Scheda"><Trash2 size={20}/></button></div></div>))}</div>)}
            </div>
        )}
        {activeTab === "activity" && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <SectionTitle icon={ClipboardList} title="Registro Allenamenti" />
                <div className="space-y-4">
                    {recentLogs.length === 0 ? <p className="text-slate-400 text-sm italic text-center py-10">Nessun log registrato finora.</p> : recentLogs.map(log => (
                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 last:border-0 last:pb-0 gap-2">
                            <div><div className="font-bold text-slate-800 text-base capitalize flex items-center gap-2">{log.exercise_name}<span className="text-[9px] uppercase font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{log.day_label}</span></div><div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Calendar size={10}/> {new Date(log.created_at).toLocaleDateString()} &bull; {new Date(log.created_at).toLocaleTimeString().slice(0,5)}</div></div>
                            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 self-start sm:self-auto w-full sm:w-auto justify-between sm:justify-start">
                                <div className="text-center"><span className="block text-[9px] font-bold text-slate-400 uppercase">Set</span><span className="font-bold text-slate-700 text-sm">{log.actual_sets || "-"}</span></div>
                                <div className="text-center"><span className="block text-[9px] font-bold text-slate-400 uppercase">Reps</span><span className="font-bold text-slate-900 text-sm font-mono">{log.actual_reps}</span></div>
                                <div className="text-center"><span className="block text-[9px] font-bold text-slate-400 uppercase">Carico</span><span className="font-bold text-green-600 text-sm font-mono">{log.actual_weight} Kg</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {showCreateProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center mb-6"><div><h2 className="text-xl font-black text-slate-900">Nuova Scheda</h2><p className="text-xs text-slate-500 font-medium">Assegna un nuovo programma</p></div><button onClick={() => setShowCreateProgram(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition"><X size={20}/></button></div>
               <div className="space-y-5">
                   <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nome Programma</label><input autoFocus value={cpTitle} onChange={e => setCpTitle(e.target.value)} placeholder="Es. Ipertrofia Base" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-lg outline-none focus:border-blue-500 focus:bg-white transition placeholder:font-normal"/></div>
                   <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Durata (Settimane)</label><input type="number" value={cpDuration} onChange={e => setCpDuration(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-lg outline-none focus:border-blue-500 focus:bg-white transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/></div>
                   {/* CAMPO NOTE AGGIUNTO */}
                   <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Note Generali Scheda</label><textarea value={cpNotes} onChange={e => setCpNotes(e.target.value)} placeholder="Es. Focus sull'intensità..." className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition resize-none h-20"/></div>
                   
                   <div className="pt-2"><button onClick={createProgram} disabled={creatingProgram} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition shadow-lg shadow-slate-300 disabled:opacity-50 flex justify-center gap-2">{creatingProgram ? "Creazione..." : <><Plus size={20}/> Crea Scheda</>}</button></div>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}