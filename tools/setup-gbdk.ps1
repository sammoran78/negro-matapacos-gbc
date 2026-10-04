$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $projectRoot '.tools'
$archive = Join-Path $toolRoot 'gbdk-win64-4.5.0.zip'
$compiler = Join-Path $toolRoot 'gbdk/bin/lcc.exe'
if (Test-Path -LiteralPath $compiler) { Write-Output $compiler; exit 0 }
New-Item -ItemType Directory -Path $toolRoot -Force | Out-Null
Invoke-WebRequest -Uri 'https://github.com/gbdk-2020/gbdk-2020/releases/download/4.5.0/gbdk-win64.zip' -OutFile $archive
$expected = '266854ce92e3064871c5b28cd3436cc2a6cb136af9e7cf617140108f8c1c5890'
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'GBDK archive checksum mismatch' }
Expand-Archive -LiteralPath $archive -DestinationPath $toolRoot
if (-not (Test-Path -LiteralPath $compiler)) { throw 'Expected GBDK compiler missing from archive' }
Write-Output $compiler
