# ROUTES_MAP

## Frontend pages
- `app/live/[id]/page.js` -> live atleta
- `app/admin/clients/[id]/page.js` -> dettaglio cliente + tab attività PT/admin
- `app/report/[id]/page.js` -> report attività scheda

## API routes
- `app/api/live-log/route.js` -> salva/aggiorna/cancella log live
- `app/api/live-log-read/route.js` -> legge log per `programId` e `weekNumber` opzionale
