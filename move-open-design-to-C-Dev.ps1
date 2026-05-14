param(
  [string]$Source = "C:\dev\bts\open-design",
  [string]$Destination = "C:\Dev\opendesign"
)

$ErrorActionPreference = "Stop"

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
  }
}

$destinationParent = Split-Path -Parent $Destination
New-Item -ItemType Directory -Force -Path $destinationParent | Out-Null

if ((Test-Path -LiteralPath $Source) -and (Test-Path -LiteralPath $Destination)) {
  $existingItems = @(Get-ChildItem -LiteralPath $Destination -Force)
  if ($existingItems.Count -gt 0) {
    throw "Destination already exists and is not empty: $Destination"
  }
  Remove-Item -LiteralPath $Destination -Force
}

if (Test-Path -LiteralPath $Source) {
  Write-Host "Moving Open Design to $Destination..."
  Move-Item -LiteralPath $Source -Destination $Destination
} elseif (Test-Path -LiteralPath $Destination) {
  Write-Host "Open Design is already at $Destination; repairing in place..."
} else {
  throw "Source installation was not found at $Source, and destination was not found at $Destination"
}

$oldLauncher = "C:\dev\bts\start-open-design.cmd"
if (Test-Path -LiteralPath $oldLauncher) {
  Remove-Item -LiteralPath $oldLauncher -Force
}

$newLauncher = Join-Path $Destination "start-open-design.cmd"
Set-Content -LiteralPath $newLauncher -Encoding ASCII -Value @(
  "@echo off",
  "setlocal",
  "cd /d ""%~dp0""",
  "node apps\daemon\dist\cli.js"
)

$oldCorepack = "C:\dev\bts\.corepack"
$newCorepack = Join-Path $Destination ".corepack"
if ((Test-Path -LiteralPath $oldCorepack) -and -not (Test-Path -LiteralPath $newCorepack)) {
  Copy-Item -LiteralPath $oldCorepack -Destination $newCorepack -Recurse -Force
}

$env:COREPACK_HOME = $newCorepack
$env:npm_config_cache = Join-Path $Destination ".cache\npm"
$env:electron_config_cache = Join-Path $Destination ".cache\electron"

Write-Host "Repairing package links for the new path..."
Invoke-Checked corepack pnpm@10.33.2 --dir $Destination install --force --child-concurrency=1

Write-Host "Building the web UI..."
Invoke-Checked corepack pnpm@10.33.2 --dir $Destination --filter "@open-design/web" build

Write-Host "Checking Open Design..."
Invoke-Checked node (Join-Path $Destination "apps\daemon\dist\cli.js") --help | Out-Null

Write-Host "Done. Start Open Design with:"
Write-Host "  $newLauncher"
