# HANDOFF GEMINI

This bundle contains the minimum working context for Trainer App.

Focus on:
- app/live/[id]/page.js
- app/api/live-log/route.js
- app/api/live-log-read/route.js
- app/admin/clients/[id]/page.js

Read these generated files first:
- PROJECT_STATE.md
- CURRENT_BUGS.md
- RECENT_CHANGES.md
- APP_TREE.txt
- ROUTE_HITS.txt

Important rule:
- live page must not read workout_logs directly from client Supabase
- use API routes for read/write

Use the included KEY_FILES folder as the primary source set.