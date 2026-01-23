"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { useParams, useSearchParams } from 'next/navigation';
import { Send, Check, Edit3, ArrowRight, MessageSquare, Calendar, Info, StickyNote, PlayCircle, Loader2 } from 'lucide-react';

export default function LiveSheetViewer() {
  const params = useParams(); 
  const searchParams = useSearchParams();
  const sheetId = params.id; 
  const clientName = searchParams.get('name') || "Atleta"; 

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [groupedExercises, setGroupedExercises] = useState({});
  const [days, setDays] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  
  // Stati per feedback
  const [exerciseNotes, setExerciseNotes] = useState({});
  const [sentStatus, setSentStatus] = useState({});
  const [feedbackHistory, setFeedbackHistory] = useState({});

  // --- PARSER INTELLIGENTE (Configurato per il tuo file Excel) ---
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l !== '');
    
    let tableStartIndex = -1;

    // 1. SCANSIONE: Cerchiamo la riga che inizia con "Giorno"
    lines.forEach((line, index) => {
      if (line.toLowerCase().startsWith("giorno") || line.toLowerCase().startsWith("\"giorno")) {
        tableStartIndex = index;
      }
    });

    if (tableStartIndex === -1) {
      console.warn("Intestazione 'Giorno' non trovata, provo fallback riga 0");
      tableStartIndex = 0; 
    }

    // 2. ESTRAZIONE DATI
    const dataLines = lines.slice(tableStartIndex + 1);

    return dataLines.map(line => {
      // Regex per CSV standard (gestisce virgole tra virgolette)
      const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
      const clean = (txt) => txt ? txt.replace(/^"|"$/g, '').trim() : '';

      // Controllo sicurezza riga vuota
      if (!cols[2]) return null; 

      // MAPPATURA SPECIFICA PER IL TUO FILE
      return {
        DayTag: clean(cols[0]) || 'Extra',
        Esercizio: clean(cols[2]), // Esercizio colonna C (indice 2)
        Serie: clean(cols[3]),
        Reps: clean(cols[4]),
        Recupero: clean(cols[5]),
        Video: clean(cols[9]),     // Video colonna J (indice 9)
        Note: clean(cols[8])       // Note colonna I (indice 8)
      };
    }).filter(row => row && row.Esercizio); 
  };

  useEffect(() => {
    const fetchGoogleSheet = async () => {
      if (!sheetId) return;
      
      try {
        // Usiamo il nostro ponte interno per evitare l'errore CORS
        const csvUrl = `/api/sheet?id=${sheetId}`;
        
        const res = await fetch(csvUrl);
        if (!res.ok) throw new Error("Impossibile caricare. Assicurati che il foglio sia Pubblicato sul Web (File > Condividi > Pubblica sul Web).");
        
        const csvText = await res.text();
        const rawData = parseCSV(csvText); // Usiamo il parser qui

        // --- TRASFORMAZIONE DATI PER INTERFACCIA ---
        const groups = {};
        const foundDays = [];

        rawData.forEach((row, index) => {
            let dayName = row.DayTag;
            let exerciseName = row.Esercizio;

            // Formattazione "Giorno A"
            if (dayName.toLowerCase().startsWith("giorno")) {
                dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase();
            }

            if (!groups[dayName]) {
                groups[dayName] = [];
                foundDays.push(dayName);
            }

            groups[dayName].push({
                ...row,
                displayName: exerciseName,
                originalIndex: index 
            });
        });

        // --- CARICAMENTO STORICO LOG ---
        const { data: logs } = await supabase
            .from('workout_logs')
            .select('*')
            .eq('assignment_id', sheetId) 
            .order('completed_at', { ascending: true });

        if (logs) {
            const historyMap = {};
            logs.forEach(log => {
                 rawData.forEach((row, idx) => {
                     const fullName = `${row.DayTag.toUpperCase()} - ${row.Esercizio}`;
                     if (log.athlete_notes.includes(`[${fullName}]`)) {
                         historyMap[idx] = log.athlete_notes.replace(`[${fullName}]`, '').trim();
                     } else if (log.athlete_notes.includes(`[${row.Esercizio}]`)) { 
                         historyMap[idx] = log.athlete_notes.replace(`[${row.Esercizio}]`, '').trim();
                     }
                 });
            });
            setFeedbackHistory(historyMap);
        }

        setGroupedExercises(groups);
        setDays(foundDays);
        if (foundDays.length > 0) setActiveTab(foundDays[0]);
        setLoading(false);

      } catch (err) {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchGoogleSheet();
  }, [sheetId]);

  const saveSingleNote = async (index, item) => {
    const noteText = exerciseNotes[index];
    if (!noteText?.trim()) return;

    const fullName = `${item.DayTag.toUpperCase()} - ${item.Esercizio}`;
    const contentToSave = `[${fullName}] ${noteText}`;

    const { error } = await supabase.from('workout_logs').insert([{ 
          assignment_id: sheetId,
          athlete_notes: contentToSave,
          completed_at: new Date().toISOString()
    }]);

    if (!error) {
      setFeedbackHistory(prev => ({ ...prev, [index]: noteText }));
      setExerciseNotes(prev => ({ ...prev, [index]: '' }));
      setSentStatus(prev => ({ ...prev, [index]: true }));
      setTimeout(() => setSentStatus(prev => ({ ...prev, [index]: false })), 2000);
    } else {
        alert("Errore salvataggio: " + error.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600 font-bold gap-2"><Loader2 className="animate-spin"/> Caricamento Scheda Live...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-8 text-center text-red-500 font-bold bg-slate-50">{error}</div>;

  const getYoutubeThumbnail = (url) => {
    if (!url) return null;
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/)([^#&?]*))/);
    return (videoIdMatch && videoIdMatch[1]) ? `https://img.youtube.com/vi/${videoIdMatch[1]}/mqdefault.jpg` : null;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <div className="bg-green-600 pb-6 pt-8 text-white rounded-b-[2rem] shadow-lg mb-4 sticky top-0 z-50">
        <div className="px-6">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-green-200 text-xs font-bold uppercase tracking-widest mb-1">Live Workout</p>
                <h1 className="text-2xl font-bold truncate">Scheda di {clientName}</h1>
             </div>
             <div className="flex items-center gap-1 bg-green-500/50 px-2 py-1 rounded text-[10px] font-bold animate-pulse">
                <div className="w-2 h-2 rounded-full bg-white"></div> LIVE
             </div>
          </div>
        </div>
        
        {days.length > 1 && (
          <div className="mt-6 flex gap-3 overflow-x-auto px-6 pb-2 no-scrollbar">
            {days.map((day) => (
              <button key={day} onClick={() => setActiveTab(day)} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === day ? 'bg-white text-green-600 shadow-lg scale-105' : 'bg-green-700/50 text-green-100 hover:bg-green-700'}`}>
                <Calendar size={14} /> {day}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4">
        <div className="space-y-5">
          {groupedExercises[activeTab] && groupedExercises[activeTab].map((item) => {
            const i = item.originalIndex; 
            const thumbnail = getYoutubeThumbnail(item.Video);

            return (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in-up">
                <div className="relative">
                  {thumbnail && (
                    <div className="h-32 w-full bg-slate-100 relative overflow-hidden">
                       <div className="absolute inset-0 bg-cover bg-center blur-sm opacity-50" style={{backgroundImage: `url(${thumbnail})`}}></div>
                       <img src={thumbnail} className="absolute inset-0 h-full w-full object-contain z-10" alt="Video preview" />
                       <div className="absolute inset-0 flex items-center justify-center z-20">
                          <a href={item.Video} target="_blank" className="bg-white/90 text-red-600 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><PlayCircle size={32} fill="currentColor" className="text-white"/></a>
                       </div>
                    </div>
                  )}

                  <div className="p-5 border-b border-slate-50 relative">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg text-slate-800 w-full leading-tight">{item.displayName}</h3>
                      {!thumbnail && item.Video && (<a href={item.Video} target="_blank" className="text-blue-500 bg-blue-50 p-2 rounded-full hover:bg-blue-100"><ArrowRight size={18} /></a>)}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100"><span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Serie</span><span className="font-bold text-slate-700 text-lg">{item.Serie}</span></div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100"><span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Reps</span><span className="font-bold text-slate-700 text-lg">{item.Reps}</span></div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100"><span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Rec</span><span className="font-bold text-slate-700 text-lg">{item.Recupero || '60s'}</span></div>
                    </div>
                    {item.Note && <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600 italic"><span className="font-bold text-slate-400 text-[10px] uppercase block mb-1">Tip Coach:</span>{item.Note}</div>}
                  </div>
                </div>

                {feedbackHistory[i] && (
                  <div className="bg-green-50/80 px-4 py-3 border-l-4 border-green-500 flex gap-3 items-start">
                    <MessageSquare size={16} className="text-green-600 mt-1 shrink-0"/>
                    <div><p className="text-[10px] font-bold text-green-600 uppercase mb-0.5">Note inviate</p><p className="text-sm text-green-800 font-medium italic">"{feedbackHistory[i]}"</p></div>
                  </div>
                )}

                <div className="bg-slate-50 p-3 flex gap-2 items-center">
                   <div className="relative flex-1 group">
                    <div className="absolute top-3.5 left-3 text-slate-400"><Edit3 size={14} /></div>
                    <input type="text" value={exerciseNotes[i] || ''} onChange={(e) => setExerciseNotes(prev => ({...prev, [i]: e.target.value}))} placeholder="Note sull'esercizio..." className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"/>
                  </div>
                  <button onClick={() => saveSingleNote(i, item)} className={`p-3 rounded-xl shadow-md transition-all active:scale-95 duration-200 ${sentStatus[i] ? 'bg-green-500 text-white shadow-green-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}>{sentStatus[i] ? <Check size={20} /> : <Send size={20} />}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}