export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import LiveClient from './LiveClient';

// NOTA: Ho rimosso la creazione di supabase da qui (globale) perché causava l'errore in build.
// La facciamo avvenire dentro la funzione getProgramData.

// Questa funzione gira sul server: velocissima e sicura
async function getProgramData(programId) {
  
  // 1. INIZIALIZZIAMO SUPABASE QUI DENTRO (Così non rompe la build)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Controllo di sicurezza: se mancano le chiavi, evitiamo il crash brutale
  if (!supabaseUrl || !supabaseKey) {
      return { error: "Errore configurazione server: mancano le chiavi Supabase." };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. Scarica i dettagli della scheda (Nome atleta, titolo)
  const { data: program, error: progError } = await supabase
    .from('programs')
    .select('*')
    .eq('id', programId)
    .single();

  if (progError || !program) return { error: "Scheda non trovata o ID errato." };

  // 3. Scarica gli esercizi ordinati
  const { data: exercises, error: exError } = await supabase
    .from('exercises')
    .select('*')
    .eq('program_id', programId)
    .order('order_index', { ascending: true });

  if (exError) return { error: "Errore caricamento esercizi." };

  return { program, exercises };
}

// Funzione che trasforma i dati del DB nel formato che piace al nostro Client
function transformData(exercises) {
    const groups = {};
    const allWeeks = new Set();

    exercises.forEach(ex => {
        if (!groups[ex.day_tag]) {
            groups[ex.day_tag] = [];
        }

        // Raccogliamo i nomi delle settimane presenti nel JSON (es. "Week 1", "Week 2")
        if (ex.weekly_data) {
            Object.keys(ex.weekly_data).forEach(w => allWeeks.add(w));
        }

        groups[ex.day_tag].push({
            DayTag: ex.day_tag,
            Esercizio: ex.name,
            Video: ex.video_url || "",
            Note: ex.notes || "",
            Weeks: ex.weekly_data || {} // Qui c'è il JSON {"Week 1": "..."}
        });
    });

    // Ordiniamo le settimane (Week 1, Week 2...)
    const sortedWeeks = Array.from(allWeeks).sort((a, b) => {
        // Logica per ordinare numeri dentro stringhe ("Week 1" prima di "Week 10")
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    return { groups, weeks: sortedWeeks };
}

export default async function LivePage({ params }) {
  // Await params in Next.js 15+ (o versioni recenti di 14) è buona norma, 
  // anche se qui params arriva già pronto, lo trattiamo in modo sicuro.
  const { id } = await params; 

  const { program, exercises, error } = await getProgramData(id);

  if (error) {
    return (
        <div className="min-h-screen flex items-center justify-center p-10 bg-slate-50 text-red-600 font-bold">
            ⚠️ {error}
        </div>
    );
  }

  // Trasformiamo i dati per il visualizzatore
  const { groups, weeks } = transformData(exercises);

  // Se non ci sono settimane definite, mettiamo un default
  const availableWeeks = weeks.length > 0 ? weeks : ["Standard"];

  return (
    <LiveClient 
        initialData={groups} 
        sheetId={id} // Usiamo l'ID Supabase come riferimento per i log
        clientName={program.client_name} 
        availableWeeks={availableWeeks} 
    />
  );
}