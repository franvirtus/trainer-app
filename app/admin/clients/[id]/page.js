"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Plus, Dumbbell, Trash2, 
  ExternalLink, Activity, Clock, Share2 
} from "lucide-react";

export default function ClientPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const supabaseUrl = "https://hamzjxkedatewqbqidkm.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXpqeGtlZGF0ZXdxYnFpZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjczNzYsImV4cCI6MjA4NDYwMzM3Nn0.YzisHzwjC__koapJ7XaJG7NZkhUYld3BPChFc4XFtNM";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [client, setClient] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: clientData } = await supabase.from("clients").select("*").eq("id", id).single();
    setClient(clientData);

    const { data: programsData } = await supabase.from("programs").select("*").eq("client_id", id).order("created_at", { ascending: false });
    setPrograms(programsData || []);

    if (programsData && programsData.length > 0) {
        const progIds = programsData.map(p => p.id);
        const { data: simpleLogs } = await supabase.from("workout_logs").select("*").in("program_id", progIds).order("created_at", { ascending: false }).limit(20);
        setRecentLogs(simpleLogs || []);
    }
    setLoading(false);
  };

  const createProgram = async () => {
    const title = prompt("Nome della nuova scheda:");
    if (!title) return;

    const { data: { user } } = await supabase.auth.getUser();
    let coachName = "COACH";
    if (user && user.user_metadata) {
        coachName = user.user_metadata.name || user.user_metadata.full_name || user.email.split('@')[0];
    }

    const { data, error } = await supabase.from("programs").insert([
        { client_id: id, title: title, coach_name: coachName, duration: 4 },
      ]).select().single();

    if (error) alert("Errore: " + error.message);
    else router.push(`/admin/editor/${data.id}`);
  };

  const deleteProgram = async (programId) => {
      if(!confirm("Sei sicuro di voler eliminare questa scheda?")) return;
      const { error } = await supabase.from("programs").delete().eq("id", programId);
      if(error) alert("Errore: " + error.message);
      else fetchData();
  };

  const copyLink = (programId) => {
    const link = `${window.location.origin}/live/${programId}`;
    if (navigator.share) {
        navigator.share({
            title: 'Scheda Allenamento',
            text: 'Ecco la tua nuova scheda!',
            url: link,
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(link);
        alert("Link copiato! Invialo all'atleta.");
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Caricamento profilo...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER CLIENTE */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/admin/dashboard")} className="p-2 hover:bg-slate-200 rounded-full transition">
              <ArrowLeft size={24} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 uppercase">{client?.name || client?.full_name}</h1>
            </div>
          </div>
          <button onClick={createProgram} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black transition active:scale-95">
            <Plus size={20} /> NUOVA SCHEDA
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLONNA SCHEDE */}
            <div className="lg:col-span-2 space-y-6">
                <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <Dumbbell size={20}/> Schede Allenamento
                </h2>
                
                {programs.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400">
                        Nessuna scheda. Clicca su "Nuova Scheda".
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {programs.map((prog) => (
                            <div key={prog.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-blue-400 transition-all">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{prog.title}</h3>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 uppercase font-bold tracking-wide">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">{prog.duration} Settimane</span>
                                        <span className="text-slate-400 flex items-center gap-1"><Clock size={12}/> {new Date(prog.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button onClick={() => router.push(`/admin/editor/${prog.id}`)} className="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition text-xs">
                                        MODIFICA
                                    </button>
                                    
                                    <button onClick={() => window.open(`/live/${prog.id}`, '_blank')} className="px-3 py-2 bg-green-50 text-green-600 font-bold rounded-lg hover:bg-green-100 transition text-xs flex items-center gap-1">
                                        <ExternalLink size={14}/> APRI LIVE
                                    </button>

                                    {/* TASTO CONDIVIDI AGGIUNTO */}
                                    <button onClick={() => copyLink(prog.id)} className="px-3 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition text-xs flex items-center gap-1">
                                        <Share2 size={14}/> CONDIVIDI
                                    </button>

                                    <button onClick={() => deleteProgram(prog.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Elimina">
                                        <Trash2 size={18}/>
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
                    <Activity size={20} className="text-green-600"/> Attività Recente
                </h2>

                <div className="bg-slate-100 rounded-2xl p-4 h-[500px] overflow-y-auto border border-slate-200 relative">
                    {recentLogs.length === 0 ? (
                        <div className="text-center text-slate-400 mt-10 text-sm">
                            Ancora nessun dato registrato dall'atleta.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentLogs.map((log) => {
                                const reps = (log.actual_reps || "").split('-').join(', ');
                                const weights = (log.actual_weight || "").split('-').join(', ');

                                return (
                                    <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-slate-800 capitalize">{log.exercise_name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                                {log.day_label} • W{log.week_number}
                                            </span>
                                        </div>
                                        <div className="text-slate-600 mb-2 font-mono text-xs">
                                            <div className="flex justify-between border-b border-slate-100 pb-1 mb-1">
                                                <span>Reps:</span> <span className="font-bold text-slate-900">{reps}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Carico:</span> <span className="font-bold text-green-600">{weights} Kg</span>
                                            </div>
                                        </div>
                                        {log.athlete_notes && (
                                            <div className="bg-yellow-50 text-yellow-800 p-2 rounded-lg text-xs italic border border-yellow-100">"{log.athlete_notes}"</div>
                                        )}
                                        <div className="text-right mt-2"><span className="text-[10px] text-slate-300">{new Date(log.created_at).toLocaleString()}</span></div>
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