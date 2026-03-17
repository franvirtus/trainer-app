Sto lavorando al progetto Trainer App.

Contesto rapido:
- stack: Next.js + Supabase + Vercel
- ambiente produzione su Supabase `hamzjxkedatewqbqidkm`
- file chiave:
  - `app/live/[id]/page.js`
  - `app/api/live-log/route.js`
  - `app/api/live-log-read/route.js`
  - `app/admin/clients/[id]/page.js`

Regole importanti:
- la live non deve leggere `workout_logs` direttamente dal client
- usare API route server per read/write dei log
- evitare patch grandi sul file live
- preferire modifiche minime e mirate

Stato attuale:
- salvataggio live funziona
- log PT/admin funzionano
- LAST funziona
- il file live è delicato e va toccato con cautela

Ti passerò solo i file coinvolti nel bug corrente.
