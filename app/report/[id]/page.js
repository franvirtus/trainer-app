"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation';
import { MessageSquare, Calendar, ArrowLeft, User, Clock } from 'lucide-react';
import Link from 'next/link';

export default function CoachReport() {
  const params = useParams();
  const [logs, setLogs] = useState([]);
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Prendiamo il titolo della scheda
      const { data: template } = await supabase
        .from('workout_templates')
        .select('title')
        .eq('id', params.id)
        .single();
      
      if (template) setWorkoutTitle(template.title);

      // 2. Prendiamo TUTTI i feedback di questa scheda, dal più recente
      const { data: feedbackData, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('assignment_id', params.id)
        .order('completed_at', { ascending: false }); // I più nuovi in alto

      if (!error) setLogs(feedbackData);
      setLoading(false);
    };

    fetchData();
  }, [params.id]);

  if (loading) return <div className="p-10 text-center text-slate-400">Caricamento report...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      
      <div className="max-w-3xl mx-auto">
        
        {/* Pulsante Indietro */}
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors font-bold text-sm">
          <ArrowLeft size={16} /> Torna alla Dashboard
        </Link>

        {/* Intestazione */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{workoutTitle}</h1>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <MessageSquare size={16} />
            <span>Report Feedback Atleta</span>
          </div>
        </div>

        {/* Lista dei Feedback */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Clock size={20} className="text-purple-500"/> Storico Attività
          </h2>

          {logs.length === 0 ? (
            <div className="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400">Nessun feedback ricevuto per questa scheda.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-purple-200 transition-all">
                
                {/* Data e Ora */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  <Calendar size={12} />
                  {new Date(log.completed_at).toLocaleDateString('it-IT', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>

                {/* Il Messaggio */}
                <div className="flex gap-4">
                  <div className="w-1 bg-purple-500 rounded-full shrink-0"></div>
                  <div>
                    {/* Se il messaggio inizia con [Esercizio], lo formattiamo carino */}
                    {log.athlete_notes.startsWith('[') ? (
                      <>
                        <span className="block text-purple-700 font-bold text-sm mb-1">
                          {log.athlete_notes.split(']')[0].replace('[', '')}
                        </span>
                        <p className="text-slate-700 leading-relaxed">
                          {log.athlete_notes.split(']')[1]}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-700 leading-relaxed">{log.athlete_notes}</p>
                    )}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}