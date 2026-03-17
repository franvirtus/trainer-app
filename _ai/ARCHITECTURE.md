# ARCHITECTURE

## Flusso live atleta
- La pagina `app/live/[id]/page.js` mostra il programma attivo
- Il salvataggio passa da `/api/live-log`
- La lettura dei log passa da `/api/live-log-read`
- Il LAST viene ricavato dai log precedenti del programma

## Flusso PT/admin
- La pagina `app/admin/clients/[id]/page.js` carica i programmi del cliente
- Per ogni programma legge i log tramite `/api/live-log-read?programId=...`
- Mostra attività e storico nella tab activity

## Report
- `app/report/[id]/page.js` serve per visualizzazione report/scheda
- va sempre allineato allo schema corrente di `programs` e `workout_logs`

## Tabelle principali
- `programs`
- `workout_logs`

## Schema log attuale rilevante
`workout_logs` contiene almeno:
- id
- created_at
- program_id
- exercise_name
- week_number
- day_label
- actual_sets
- actual_reps
- actual_weight
- athlete_notes
- completed
- athlete_metrics
- pt_metrics
- pt_rpe
- rpe
- pt_notes
- exercise_index
- exercise_uid
- exercise_name_snapshot

## Regole architetturali
- nessuna query diretta client su `workout_logs` nella live
- centralizzare read/write log nelle API route
- mantenere coerenza fra save, read e history
