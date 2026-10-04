param([int]$Scale = 4, [switch]$Mute)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
if (!(Test-Path -LiteralPath $pythonPath)) { $pythonPath = (Get-Command python -ErrorAction Stop).Source }
if (!(Test-Path -LiteralPath (Join-Path $projectRoot '.tools/pyboy/pyboy'))) { & (Join-Path $PSScriptRoot 'setup-pyboy.ps1') -Python $pythonPath }
if (!(Test-Path -LiteralPath (Join-Path $projectRoot 'build/matapacos.gbc'))) {
    & node (Join-Path $PSScriptRoot 'build-rom.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'ROM build failed.' }
}
$playArgs = @((Join-Path $PSScriptRoot 'play-game.py'), '--scale', $Scale)
if ($Mute) { $playArgs += '--mute' }
& $pythonPath @playArgs
