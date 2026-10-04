param([string]$Python)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (!$Python) {
    $bundledPython = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
    if (Test-Path -LiteralPath $bundledPython) { $Python = $bundledPython }
    else { $Python = (Get-Command python -ErrorAction Stop).Source }
}
# Free, project-local packages. No global Python installation is modified.
& $Python -m pip install --target (Join-Path $projectRoot '.tools/pyboy') 'pyboy==2.7.0' 'Pillow>=11,<13'
if ($LASTEXITCODE -ne 0) { throw 'PyBoy installation failed.' }
