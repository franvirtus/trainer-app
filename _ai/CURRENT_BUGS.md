# CURRENT_BUGS

## Critici aperti
- Nessuno critico al momento

## Da monitorare
- Possibili collisioni chiavi esercizi se stesso uid/nome appare in giorni diversi
- `app/live/[id]/page.js` è grande e delicato, va refactorato in moduli più piccoli
- attenzione a non reintrodurre query client dirette su `workout_logs`

## Risolti di recente
- errore 500 su `/api/live-log` per env server mancanti su Vercel
- tab attività PT/admin vuota
- LAST lato live non visibile
- dati live che sparivano cambiando settimana o dopo refresh
