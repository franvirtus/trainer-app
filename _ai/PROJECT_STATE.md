# PROJECT_STATE

## Nome progetto
Trainer App

## Scopo
App per gestione schede atleta/PT con live logging, storico, report attività e area admin.

## Stack
- Next.js App Router
- Supabase
- Vercel
- JavaScript / React

## Ambienti

### Produzione
- Supabase URL: https://hamzjxkedatewqbqidkm.supabase.co
- Vercel project: trainer-app
- Dominio usato nei test: trainer-app-nine.vercel.app

### Dev
- Supabase URL: https://nklfiqaxnafeezpgqcqk.supabase.co

## Stato attuale
Funziona:
- salvataggio log in live
- lettura log lato PT/admin
- LAST lato live
- cambio settimana con persistenza dati

## Regole importanti
- NON leggere `workout_logs` direttamente dal client nella live page
- usare sempre le API route server per leggere/scrivere i log
- evitare patch grandi su `app/live/[id]/page.js` senza test rapidi
- fare commit piccoli e mirati

## File chiave
- app/live/[id]/page.js
- app/api/live-log/route.js
- app/api/live-log-read/route.js
- app/admin/clients/[id]/page.js
- app/report/[id]/page.js

## Nota tecnica importante
Il bug principale risolto il 17/03/2026 era questo:
- il salvataggio live passava da route server
- la lettura live leggeva direttamente Supabase dal client
- risultato: dopo refresh/cambio settimana i dati sembravano sparire
- fix: usare `/api/live-log-read` anche per la lettura live
