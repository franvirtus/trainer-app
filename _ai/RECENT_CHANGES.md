# RECENT_CHANGES

## 2026-03-17
- aggiunta `SUPABASE_SERVICE_ROLE_KEY` su Vercel
- sistemata la lettura dei log live usando `/api/live-log-read`
- ripristinata la persistenza dati tra refresh/cambio settimana
- LAST live tornato visibile
- log lato PT/admin tornati visibili

## Nota
Quando si tocca `app/live/[id]/page.js`, testare sempre:
1. salvataggio live
2. cambio settimana
3. ritorno alla settimana precedente
4. LAST
5. log lato PT/admin
