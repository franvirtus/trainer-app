"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation';
import { Send, Check, Edit3, ArrowRight, MessageSquare, Calendar, Info } from 'lucide-react';

export default function AthleteView() {
  const params = useParams(); 
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [groupedExercises, setGroupedExercises] = useState({});
  const [days, setDays] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  
  const [exerciseNotes, setExerciseNotes] = useState({});
  const [sentStatus, setSentStatus] = useState({});
  const [feedbackHistory, setFeedbackHistory] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;

      const { data: template } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', params.id)
        .single();

      if (template) {
        setWorkout(template);

        const groups = {};
        const foundDays = [];

        if (Array.isArray(template.content)) {
          template.content.forEach((ex, index) => {
            let dayName = "SCHEDA COMPLETA";
            let exerciseName = ex.Esercizio;

            if (ex.Esercizio.includes(" - ")) {
              const parts = ex.Esercizio.split(" - ");
              dayName = parts[0].trim().toUpperCase();
              exerciseName = parts.slice(1).join(" - ").trim();
            }

            if (!groups[dayName]) {
              groups[dayName] = [];
              foundDays.push(dayName);
            }

            groups[dayName].push({
              ...ex,
              displayName: exerciseName,
              originalIndex: index
            });
          });
        }

        setGroupedExercises(groups);
        setDays(foundDays);
        if (foundDays.length > 0) setActiveTab(foundDays[0]);
        
        const { data: logs } = await supabase
          .from('workout_logs')
          .select('*')
          .eq('assignment_id', params.id)
          .order('completed_at', { ascending: true });

        if (logs && logs.length > 0 && template.content) {
          const historyMap = {};
          logs.forEach(log => {
            template.content.forEach((ex, index) => {
              if (log.athlete_notes.startsWith(`[${ex.Esercizio}]`)) {
                const cleanText = log.athlete_notes.replace(`[${ex.Esercizio}]`, '').trim();
                historyMap[index] = cleanText;
              }
            });
          });
          setFeedbackHistory(historyMap);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [params.id]);

  const handleNoteChange = (originalIndex, text) => {
    setExerciseNotes(prev => ({ ...prev, [originalIndex]: text }));
  };

  const saveSingleNote = async (originalIndex, fullExerciseName) => {
    const noteText = exerciseNotes[originalIndex];
    if (!noteText || noteText.trim() === "") return;

    const contentToSave = `[${fullExerciseName}] ${noteText}`;

    const { error } = await supabase
      .from('workout_logs')
      .insert([{ 
          assignment_id: params.id, 
          athlete_notes: contentToSave,
          completed_at: new Date().toISOString()
        }]);

    if (!error) {
      setFeedbackHistory(prev => ({ ...prev, [originalIndex]: noteText }));
      setExerciseNotes(prev => ({ ...prev, [originalIndex]: '' }));
      setSentStatus(prev => ({ ...prev, [originalIndex]: true }));
      setTimeout(() => setSentStatus(prev => ({ ...prev, [originalIndex]: false })), 2000);
    } else {
      alert("Errore: " + error.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600 font-bold">Caricamento...</div>;
  if (!workout) return <div className="p-10 text-center text-red-500">Scheda non trovata.</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      
      {/* Header Fisso */}
      <div className="bg-blue-600 pb-6 pt-8 text-white rounded-b-[2rem] shadow-lg mb-4 sticky top-0 z-50">
        <div className="px-6">
          <h1 className="text-xl font-bold truncate">{workout.title}</h1>
          
          {/* NOTE DEL COACH GLOBALI */}
          {workout.coach_notes && (
            <div className="mt-3 bg-blue-800/50 p-3 rounded-xl border border-blue-400/30 flex gap-3 items-start">
              <Info size={18} className="text-blue-200 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-100 italic leading-relaxed">{workout.coach_notes}</p>
            </div>
          )}
        </div>

        {/* TABS */}
        {days.length > 1 && (
          <div className="mt-6 flex gap-3 overflow-x-auto px-6 pb-2 no-scrollbar">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setActiveTab(day)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === day 
                    ? 'bg-white text-blue-600 shadow-lg scale-105' 
                    : 'bg-blue-700/50 text-blue-100 hover:bg-blue-700'
                }`}
              >
                <Calendar size={14} />
                {day}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4">
        
        <div className="mb-4 ml-2 flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          {activeTab}
        </div>

        <div className="space-y-5">
          {groupedExercises[activeTab] && groupedExercises[activeTab].map((item) => {
            const i = item.originalIndex; 
            
            return (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in-up">
                
                <div className="p-5 border-b border-slate-50 relative">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-slate-800 w-3/4 leading-tight">{item.displayName}</h3>
                    {item.Video && (
                      <a href={item.Video} target="_blank" className="text-blue-500 bg-blue-50 p-2 rounded-full hover:bg-blue-100 active:bg-blue-200 transition-colors">
                        <ArrowRight size={18} />
                      </a>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Serie</span>
                      <span className="font-bold text-slate-700 text-lg">{item.Serie}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Reps</span>
                      <span className="font-bold text-slate-700 text-lg">{item.Reps}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Rec</span>
                      <span className="font-bold text-slate-700 text-lg">{item.Recupero || '60s'}</span>
                    </div>
                  </div>

                  {/* NOTA SPECIFICA ESERCIZIO */}
                  {item.Note && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600 italic">
                      <span className="font-bold text-slate-400 text-[10px] uppercase block mb-1">Tip Coach:</span>
                      {item.Note}
                    </div>
                  )}
                </div>

                {/* Feedback Storico */}
                {feedbackHistory[i] && (
                  <div className="bg-green-50/80 px-4 py-3 border-l-4 border-green-500 flex gap-3 items-start">
                    <MessageSquare size={16} className="text-green-600 mt-1 shrink-0"/>
                    <div>
                      <p className="text-[10px] font-bold text-green-600 uppercase mb-0.5">Note inviate</p>
                      <p className="text-sm text-green-800 font-medium italic">"{feedbackHistory[i]}"</p>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 p-3 flex gap-2 items-center">
                  <div className="relative flex-1 group">
                    <div className="absolute top-3.5 left-3 text-slate-400">
                      <Edit3 size={14} />
                    </div>
                    <input 
                      type="text"
                      value={exerciseNotes[i] || ''}
                      onChange={(e) => handleNoteChange(i, e.target.value)}
                      placeholder="Note sull'esercizio..."
                      className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                  
                  <button 
                    onClick={() => saveSingleNote(i, item.Esercizio)} 
                    className={`p-3 rounded-xl shadow-md transition-all active:scale-95 duration-200 ${
                      sentStatus[i] ? 'bg-green-500 text-white shadow-green-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                    }`}
                  >
                    {sentStatus[i] ? <Check size={20} /> : <Send size={20} />}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
        
        <div className="h-20 text-center flex flex-col items-center justify-center opacity-30 mt-8">
          <div className="w-12 h-1 bg-slate-300 rounded-full mb-2"></div>
          <p className="text-[10px] uppercase font-bold text-slate-400">Fine Allenamento</p>
        </div>
      </div>
    </div>
  );
}