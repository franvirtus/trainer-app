# COMMANDS

## Albero file app
tree app /F /A > _ai\app_tree.txt

## Cercare riferimenti ai log
Get-ChildItem -Recurse app -Include *.js,*.jsx,*.ts,*.tsx | Select-String -Pattern "workout_logs|actual_sets|actual_reps|athlete_notes|pt_notes|exercise_uid|program_id" | Out-File _ai\ricerca_log.txt

## Estrarre un file specifico
Get-Content -LiteralPath "app\live\[id]\page.js" > live-page.txt

## Git status
git status

## Push branch corrente
git push origin HEAD
