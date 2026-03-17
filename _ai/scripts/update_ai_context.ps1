$ErrorActionPreference = "Stop"

$scriptPath = $MyInvocation.MyCommand.Path
if (-not $scriptPath) {
    throw "Esegui questo script come file .ps1, non incollandolo direttamente nel terminale."
}

$scriptsDir = Split-Path -Parent $scriptPath
$aiDir = Split-Path -Parent $scriptsDir
$projectRoot = Split-Path -Parent $aiDir
$generated = Join-Path $aiDir "generated"
$keyFilesDir = Join-Path $generated "KEY_FILES"

New-Item -ItemType Directory -Force -Path $generated | Out-Null
New-Item -ItemType Directory -Force -Path $keyFilesDir | Out-Null

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Safe-Run {
    param(
        [scriptblock]$Script,
        [string]$Fallback = ""
    )
    try {
        & $Script | Out-String
    } catch {
        $Fallback
    }
}

Set-Location $projectRoot

$appTree = Safe-Run { cmd /c "tree app /F /A" } "tree non disponibile"
Write-Utf8NoBom -Path (Join-Path $generated "APP_TREE.txt") -Content $appTree

$gitStatus = Safe-Run { git status --short --branch } "git status non disponibile"
Write-Utf8NoBom -Path (Join-Path $generated "GIT_STATUS.txt") -Content $gitStatus

$gitLog = Safe-Run { git log --oneline -20 } "git log non disponibile"
Write-Utf8NoBom -Path (Join-Path $generated "GIT_LOG_RECENT.txt") -Content $gitLog

$patterns = @(
    "workout_logs",
    "programs",
    "live-log",
    "live-log-read",
    "actual_sets",
    "actual_reps",
    "actual_weight",
    "athlete_notes",
    "pt_notes",
    "exercise_uid",
    "program_id"
)

$routeHits = Safe-Run {
    Get-ChildItem -Recurse app -Include *.js,*.jsx,*.ts,*.tsx |
        Select-String -Pattern ($patterns -join "|") |
        ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
} "ricerca non disponibile"

Write-Utf8NoBom -Path (Join-Path $generated "ROUTE_HITS.txt") -Content $routeHits

$keyFiles = @(
    "app\live\[id]\page.js",
    "app\api\live-log\route.js",
    "app\api\live-log-read\route.js",
    "app\admin\clients\[id]\page.js",
    "app\report\[id]\page.js",
    "_ai\PROJECT_STATE.md",
    "_ai\CURRENT_BUGS.md",
    "_ai\RECENT_CHANGES.md",
    "_ai\ARCHITECTURE.md",
    "_ai\ROUTES_MAP.md",
    "_ai\HANDOFF_PROMPT.md"
)

$copiedFiles = @()
foreach ($file in $keyFiles) {
    $full = Join-Path $projectRoot $file
    if (Test-Path -LiteralPath $full) {
        $safeName = $file -replace '[\\/\[\]:]', '__'
        $dest = Join-Path $keyFilesDir ($safeName + ".txt")
        $content = Get-Content -LiteralPath $full -Raw
        Write-Utf8NoBom -Path $dest -Content $content
        $copiedFiles += $file
    }
}

$handoffOpenAI = @"
# HANDOFF OPENAI

## Project
Trainer App

## Generated on
$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## What to read first
1. _ai/PROJECT_STATE.md
2. _ai/CURRENT_BUGS.md
3. _ai/RECENT_CHANGES.md
4. app/live/[id]/page.js
5. app/api/live-log/route.js
6. app/api/live-log-read/route.js
7. app/admin/clients/[id]/page.js

## Rules
- Do not reintroduce direct client reads to workout_logs in live page
- Prefer minimal patches
- Keep live save/read aligned through API routes

## Files copied into bundle
$($copiedFiles -join "`n")
"@

Write-Utf8NoBom -Path (Join-Path $generated "HANDOFF_OPENAI.md") -Content $handoffOpenAI

$handoffGemini = @"
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
"@

Write-Utf8NoBom -Path (Join-Path $generated "HANDOFF_GEMINI.md") -Content $handoffGemini

Write-Host "Context aggiornato in _ai\generated"