"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Loader2, ArrowRight, Eye, Trash2, Plus, Save, X, Edit, 
  Lock, LogOut, User, StickyNote, Share2, Users, UserPlus, XCircle
} from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  // --- CONFIGURAZIONE ---
  const SECRET_PASSWORD = "trainer2024"; 
  const ADMIN_USERNAME = "fransuperadm"; // <--- CAMBIA QUESTO col tuo nome utente esatto!

  // --- STATI AUTH ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [coachUser, setCoachUser] = useState(""); 
  
  // Login Form
  const [inputUser, setInputUser] = useState("");
  const [inputPass, setInputPass] = useState("");
  const [loginStatus, setLoginStatus] = useState("idle"); 

  // --- STATI APP ---
  const [view, setView] = useState('dashboard'); 
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);
  const [savedWorkouts, setSavedWorkouts] = useState([]);

  // --- STATI GESTIONE TEAM (Nuovi) ---
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [teamList, setTeamList] = useState([]);
  const [newCoachName, setNewCoachName] = useState("");
  const [loadingTeam, setLoadingTeam] = useState(false);

  // --- STATI EDITOR ---
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('setup');
  
  const [schedaName, setSchedaName] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [daysStructure, setDaysStructure] = useState(['Giorno A']);
  const [manualExercises, setManualExercises] = useState([]); 
  const [dayNotes, setDayNotes] = useState({});
  const [currentEx, setCurrentEx] = useState({
    day: '', name: '', serie: '', reps: '', rec: '', video: '', note: '' 
  });

  // --- AUTH CHECK ---
  useEffect(() => {
    const storedAuth = localStorage.getItem("trainer_auth");
    const storedUser = localStorage.getItem("trainer_user");
    if (storedAuth === "true" && storedUser) {
      setIsAuthenticated(true);
      setCoachUser(storedUser);
    } 
  }, []);

  // --- FETCH DATI ---
  useEffect(() => {
    if (isAuthenticated && coachUser) {
      fetchWorkouts();
    }
  }, [isAuthenticated, coachUser]);

  const fetchWorkouts = async () => {
    setLoadingWorkouts(true);
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('coach_id', coachUser) 
      .order('created_at', { ascending: false });

    if (!error) setSavedWorkouts(data);
    setLoadingWorkouts(false);
  };

  // --- NUOVA LOGICA: GESTIONE TEAM ---
  const openTeamPanel = async () => {
    setShowTeamPanel(true);
    fetchTeam();
  };

  const fetchTeam = async () => {
    setLoadingTeam(true);
    const { data, error } = await supabase
      .from('allowed_coaches')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error) setTeamList(data);
    setLoadingTeam(false);
  };

  const addCoachToTeam = async () => {
    if (!newCoachName.trim()) return;
    const cleanName = newCoachName.trim().toLowerCase();
    
    const { error } = await supabase
      .from('allowed_coaches')
      .insert([{ username: cleanName }]);

    if (error) {
      alert("Errore: " + error.message);
    } else {
      setNewCoachName("");
      fetchTeam(); // Ricarica lista
    }
  };

  const removeCoachFromTeam = async (id) => {
    if (!confirm("Sei sicuro di voler rimuovere questo Coach? Non potrà più accedere.")) return;
    const { error } = await supabase
      .from('allowed_coaches')
      .delete()
      .eq('id', id);
    
    if (!error) {
      fetchTeam();
    }
  };

  // --- LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginStatus("loading");

    if (inputPass !== SECRET_PASSWORD) {
      setLoginStatus("error");
      return;
    }

    const userClean = inputUser.trim().toLowerCase();
    const { data, error } = await supabase
      .from('allowed_coaches')
      .select('username')
      .eq('username', userClean)
      .single();

    if (error || !data) {
      setLoginStatus("unauthorized");
      return;
    }

    setIsAuthenticated(true);
    setCoachUser(userClean);
    localStorage.setItem("trainer_auth", "true");
    localStorage.setItem("trainer_user", userClean);
    setLoginStatus("idle");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCoachUser("");
    localStorage.removeItem("trainer_auth");
    localStorage.removeItem("trainer_user");
    setInputPass("");
    setInputUser("");
    setSavedWorkouts([]);
    setLoginStatus("idle");
  };

  const shareOnWhatsApp = (id, title) => {
    const url = `${window.location.origin}/scheda/${id}`;
    const text = `Ciao! Ecco la tua scheda di allenamento "${title}": ${url}`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappLink, '_blank');
  };

  // --- SALVATAGGIO SCHEDA ---
  const handleSave = async () => {
    if (manualExercises.length === 0) { alert("Aggiungi almeno un esercizio!"); return; }
    setUploading(true);

    const finalContent = [...manualExercises];
    Object.keys(dayNotes).forEach(day => {
      if (dayNotes[day] && dayNotes[day].trim() !== "") {
        finalContent.unshift({ type: 'day_note', day: day, text: dayNotes[day] });
      }
    });

    const payload = { 
      title: schedaName, 
      coach_notes: coachNotes, 
      content: finalContent,
      coach_id: coachUser 
    };

    let error;
    if (editingId) {
      const { error: err } = await supabase.from('workout_templates').update(payload).eq('id', editingId);
      error = err;
    } else {
      const { error: err } = await supabase.from('workout_templates').insert([payload]);
      error = err;
    }

    if (error) {
      alert("Errore: " + error.message);
    } else {
      alert(editingId ? "Scheda aggiornata!" : "Scheda creata!");
      resetEditor();
      fetchWorkouts(); 
      setView('dashboard');
    }
    setUploading(false);
  };

  // --- HELPER FUNCS ---
  const handleDaysChange = (num) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    setDaysStructure(Array.from({ length: num }, (_, i) => `Giorno ${letters[i]}`));
  };
  const startCreating = () => {
    if (!schedaName) { alert("Dai un nome alla scheda!"); return; }
    setActiveTab('builder');
    setCurrentEx(prev => ({ ...prev, day: daysStructure[0] }));
  };
  const addExercise = () => {
    if (!currentEx.name || !currentEx.serie || !currentEx.reps) { alert("Dati mancanti!"); return; }
    setManualExercises([...manualExercises, {
      Esercizio: `${currentEx.day.toUpperCase()} - ${currentEx.name}`,
      Serie: currentEx.serie, Reps: currentEx.reps, Recupero: currentEx.rec || '60s',
      Video: currentEx.video, Note: currentEx.note, DayTag: currentEx.day
    }]);
    setCurrentEx({ ...currentEx, name: '', serie: '', reps: '', rec: '', video: '', note: '' });
  };
  const removeExercise = (index) => {
    const newList = [...manualExercises];
    newList.splice(index, 1);
    setManualExercises(newList);
  };
  const loadForEdit = (workout) => {
    setEditingId(workout.id);
    setSchedaName(workout.title);
    setCoachNotes(workout.coach_notes || '');
    let extractedExercises = [];
    let extractedDayNotes = {};
    let foundDays = new Set();
    if (Array.isArray(workout.content)) {
      workout.content.forEach(item => {
        if (item.type === 'day_note') {
          extractedDayNotes[item.day] = item.text;
          foundDays.add(item.day);
        } else {
          let day = "Extra";
          let pureName = item.Esercizio;
          if (item.Esercizio.includes(" - ")) {
            const parts = item.Esercizio.split(" - ");
            day = parts[0].trim(); day = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase(); pureName = parts.slice(1).join(" - ");
          }
          foundDays.add(day);
          extractedExercises.push({ ...item, name: pureName, DayTag: day });
        }
      });
    }
    const sortedDays = Array.from(foundDays).sort();
    if (sortedDays.length > 0) setDaysStructure(sortedDays);
    setManualExercises(extractedExercises);
    setDayNotes(extractedDayNotes);
    setView('editor');
    setActiveTab('builder');
    if (sortedDays.length > 0) setCurrentEx(prev => ({...prev, day: sortedDays[0]}));
  };
  const resetEditor = () => {
    setEditingId(null); setSchedaName(''); setCoachNotes(''); setDaysStructure(['Giorno A']); setManualExercises([]); setDayNotes({}); setActiveTab('setup');
  };
  const deleteWorkout = async (id) => {
    if (!confirm("Eliminare definitivamente?")) return;
    await supabase.from('workout_logs').delete().eq('assignment_id', id);
    await supabase.from('workout_templates').delete().eq('id', id);
    setSavedWorkouts(prev => prev.filter(w => w.id !== id));
  };

  // --- RENDER LOGIN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="text-blue-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Area Coach</h1>
          <p className="text-slate-500 mb-6">Identificati per accedere.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-left"><label className="text-xs font-bold text-slate-400 uppercase ml-2">Nome Coach</label><input type="text" placeholder="Es. francesco" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800" value={inputUser} onChange={(e) => setInputUser(e.target.value)}/></div>
            <div className="text-left"><label className="text-xs font-bold text-slate-400 uppercase ml-2">Password Sistema</label><input type="password" placeholder="Password..." className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" value={inputPass} onChange={(e) => { setInputPass(e.target.value); setLoginStatus("idle"); }}/></div>
            {loginStatus === "error" && <p className="text-red-500 text-sm font-bold animate-pulse">Password Errata</p>}
            {loginStatus === "unauthorized" && <p className="text-orange-500 text-sm font-bold animate-pulse">Coach non abilitato</p>}
            <button type="submit" disabled={loginStatus === "loading"} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex justify-center">{loginStatus === "loading" ? <Loader2 className="animate-spin" /> : `Entra come ${inputUser || 'Coach'}`}</button>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER DASHBOARD ---
  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Ciao {coachUser} 👋</h1>
              <p className="text-slate-400">Dashboard Personale</p>
            </div>
            <div className="flex gap-2">
              {/* TASTO ADMIN VISIBILE SOLO A TE */}
              {coachUser === ADMIN_USERNAME && (
                <button onClick={openTeamPanel} className="bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2">
                  <Users size={20} /> Team
                </button>
              )}
              <button onClick={handleLogout} className="bg-white text-slate-500 px-4 py-3 rounded-xl font-bold border border-slate-200 hover:bg-red-50 hover:text-red-500 transition-all flex items-center gap-2">
                <LogOut size={20} />
              </button>
              <button onClick={() => { resetEditor(); setView('editor'); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
                <Plus size={20} /> Nuova
              </button>
            </div>
          </div>

          {/* PANNELLO TEAM (MODALE) */}
          {showTeamPanel && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> Gestione Team</h2>
                  <button onClick={() => setShowTeamPanel(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><X size={20}/></button>
                </div>
                
                {/* Aggiungi */}
                <div className="flex gap-2 mb-8">
                  <input 
                    type="text" 
                    placeholder="Nome nuovo coach..." 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
                    value={newCoachName}
                    onChange={(e) => setNewCoachName(e.target.value)}
                  />
                  <button onClick={addCoachToTeam} className="bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700"><UserPlus size={20}/></button>
                </div>

                {/* Lista */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  <p className="text-xs font-bold text-slate-400 uppercase">Coach Attivi ({teamList.length})</p>
                  {loadingTeam ? <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-blue-500"/></div> : (
                    teamList.map(coach => (
                      <div key={coach.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-700 capitalize">{coach.username}</span>
                        {coach.username !== ADMIN_USERNAME ? (
                          <button onClick={() => removeCoachFromTeam(coach.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                        ) : (
                          <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold">ADMIN</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Lista Schede */}
          {loadingWorkouts ? (
            <p className="text-center text-slate-400 mt-20">Caricamento...</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedWorkouts.map((workout) => (
                <div key={workout.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => loadForEdit(workout)} className="text-slate-300 hover:text-blue-500 p-1"><Edit size={18} /></button>
                    <button onClick={() => deleteWorkout(workout.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={18} /></button>
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 mb-1">{workout.title}</h3>
                  <p className="text-xs text-slate-400 mb-6">{new Date(workout.created_at).toLocaleDateString()}</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Link href={`/report/${workout.id}`} className="bg-purple-50 text-purple-600 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-100"><Eye size={14} /> Report</Link>
                    <Link href={`/scheda/${workout.id}`} className="bg-blue-50 text-blue-600 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100"><ArrowRight size={14} /> Link</Link>
                  </div>
                  <button onClick={() => shareOnWhatsApp(workout.id, workout.title)} className="w-full bg-green-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-green-600 shadow-green-200 shadow-md transition-all"><Share2 size={14} /> WhatsApp</button>
                </div>
              ))}
              {savedWorkouts.length === 0 && (
                <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
                  <p className="text-slate-400 mb-4">Nessuna scheda presente.</p>
                  <button onClick={() => { resetEditor(); setView('editor'); }} className="text-blue-600 font-bold underline">Crea scheda</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER EDITOR (Standard) ---
  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="border-b border-slate-100 p-4 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
        <button onClick={() => setView('dashboard')} className="text-slate-400 hover:text-slate-800 font-bold flex items-center gap-2 text-sm"><ArrowRight className="rotate-180" size={16}/> Indietro</button>
        <span className="font-bold text-slate-800">{editingId ? "Modifica" : "Nuova"} ({coachUser})</span>
        <button onClick={handleSave} disabled={uploading} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-black">{uploading ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Salva</>}</button>
      </div>
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex gap-8 mb-8 border-b border-slate-100">
          <button onClick={() => setActiveTab('setup')} className={`pb-4 text-sm font-bold transition-colors ${activeTab === 'setup' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>1. Setup</button>
          <button onClick={startCreating} className={`pb-4 text-sm font-bold transition-colors ${activeTab === 'builder' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>2. Esercizi</button>
        </div>
        {activeTab === 'setup' && (
          <div className="space-y-6 animate-fade-in">
            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome Scheda</label><input type="text" value={schedaName} onChange={e => setSchedaName(e.target.value)} className="w-full text-2xl font-bold border-b border-slate-200 py-2 focus:border-blue-600 outline-none placeholder:text-slate-200" placeholder="Es. Ipertrofia" /></div>
            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Giorni</label><div className="flex gap-2 mb-2">{[1, 2, 3, 4, 5, 6].map(num => (<button key={num} onClick={() => handleDaysChange(num)} className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${daysStructure.length === num ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>{num}</button>))}</div></div>
            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Note Generali</label><textarea value={coachNotes} onChange={e => setCoachNotes(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm h-32 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Note..." /></div>
            <button onClick={startCreating} className="w-full bg-blue-50 text-blue-600 font-bold py-4 rounded-xl hover:bg-blue-100 transition-colors">Avanti <ArrowRight className="inline ml-2" size={16}/></button>
          </div>
        )}
        {activeTab === 'builder' && (
          <div className="animate-fade-in">
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-1 bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl p-6 sticky top-24">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-500"/> Aggiungi</h3>
                <div className="space-y-4">
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Giorno</label><select value={currentEx.day} onChange={e => setCurrentEx({...currentEx, day: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border-r-[10px] border-transparent outline-none font-bold text-slate-700 cursor-pointer">{daysStructure.map(day => <option key={day} value={day}>{day}</option>)}</select></div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Esercizio</label><input type="text" value={currentEx.name} onChange={e => setCurrentEx({...currentEx, name: e.target.value})} className="w-full p-2 border-b border-slate-200 outline-none text-sm font-bold" placeholder="Es. Panca Piana"/></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[10px] text-slate-400 uppercase">Serie</label><input type="text" value={currentEx.serie} onChange={e => setCurrentEx({...currentEx, serie: e.target.value})} className="w-full p-2 border-b border-slate-200 outline-none text-sm text-center" placeholder="4"/></div>
                    <div><label className="text-[10px] text-slate-400 uppercase">Reps</label><input type="text" value={currentEx.reps} onChange={e => setCurrentEx({...currentEx, reps: e.target.value})} className="w-full p-2 border-b border-slate-200 outline-none text-sm text-center" placeholder="10"/></div>
                    <div><label className="text-[10px] text-slate-400 uppercase">Rec</label><input type="text" value={currentEx.rec} onChange={e => setCurrentEx({...currentEx, rec: e.target.value})} className="w-full p-2 border-b border-slate-200 outline-none text-sm text-center" placeholder="60s"/></div>
                  </div>
                  <div><label className="text-[10px] text-slate-400 uppercase">Note</label><input type="text" value={currentEx.note} onChange={e => setCurrentEx({...currentEx, note: e.target.value})} className="w-full p-2 border-b border-slate-200 outline-none text-sm text-slate-500" placeholder="Es. Fermo 2s"/></div>
                  <div><label className="text-[10px] text-slate-400 uppercase">Video</label><input type="text" value={currentEx.video} onChange={e => setCurrentEx({...currentEx, video: e.target.value})} className="w-full p-2 border-b border-slate-200 outline-none text-sm text-blue-500" placeholder="https://..."/></div>
                  <button onClick={addExercise} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors">Inserisci</button>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-8">
                {daysStructure.map((day) => (
                  <div key={day} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{day}</h3>
                      <div className="w-1/2"><input type="text" placeholder={`Note ${day}...`} value={dayNotes[day] || ''} onChange={(e) => setDayNotes({...dayNotes, [day]: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 focus:ring-1 focus:ring-blue-400 outline-none" /></div>
                    </div>
                    <div className="space-y-3">
                      {manualExercises.filter(ex => ex.DayTag === day).map((ex, i) => (
                        <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group">
                          <div>
                            <span className="font-bold text-slate-800 block">{ex.Esercizio.split(" - ")[1] || ex.Esercizio}</span>
                            <div className="flex gap-2 text-xs text-slate-500 mt-1"><span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">{ex.Serie} x {ex.Reps}</span><span>Rec: {ex.Recupero}</span>{ex.Note && <span className="text-amber-600 italic flex items-center gap-1"><StickyNote size={10}/> {ex.Note}</span>}</div>
                          </div>
                          <button onClick={() => removeExercise(manualExercises.indexOf(ex))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={18} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}