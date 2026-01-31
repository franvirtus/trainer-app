# Ignora le cartelle di sistema e node_modules per non intasare
$exclude = @("node_modules", ".next", ".git", ".vscode")
$output = "tutto_il_codice.txt"

# Pulisce il file vecchio se esiste
if (Test-Path $output) { Remove-Item $output }

# 1. Scrive la struttura delle cartelle (l'albero)
Add-Content -Path $output -Value "STRUTTURA CARTELLE:"
Get-ChildItem -Recurse -Directory | Where-Object { 
    $path = $_.FullName; $skip = $false
    foreach ($e in $exclude) { if ($path -match $e) { $skip = $true } }
    return -not $skip
} | ForEach-Object { Add-Content -Path $output -Value $_.FullName.Replace($PWD.Path, "") }

Add-Content -Path $output -Value "`n=========================================`n"

# 2. Scrive il contenuto dei file .js e .css
Get-ChildItem -Recurse -Include *.js,*.jsx,*.css | Where-Object { 
    $path = $_.FullName; $skip = $false
    foreach ($e in $exclude) { if ($path -match $e) { $skip = $true } }
    return -not $skip
} | ForEach-Object {
    Add-Content -Path $output -Value "FILE: $($_.FullName.Replace($PWD.Path, ''))"
    Add-Content -Path $output -Value "-----------------------------------------"
    try { Get-Content $_.FullName | Add-Content -Path $output } catch {}
    Add-Content -Path $output -Value "`n=========================================`n"
}

Write-Host "Fatto! Carica il file 'tutto_il_codice.txt' nella chat." -ForegroundColor Green