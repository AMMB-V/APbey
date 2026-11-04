[CmdletBinding()]
param(
  [ValidateSet('start', 'reset', 'test', 'verify', 'stop', 'status')]
  [string]$Action = 'verify'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Find-CommandPath([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -eq $command) {
    return $null
  }
  return $command.Source
}

function Require-Command([string]$Name, [string]$InstallHint) {
  $path = Find-CommandPath $Name
  if ($null -eq $path) {
    throw "$Name no está instalado o no está en PATH. $InstallHint"
  }
  return $path
}

function Invoke-Supabase([string[]]$Arguments) {
  & $supabase @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase terminó con código $LASTEXITCODE."
  }
}

$supabase = Require-Command 'supabase.cmd' 'Instálalo con: npm install --global supabase'

if ($Action -eq 'stop') {
  Invoke-Supabase @('stop')
  exit 0
}

if ($Action -eq 'status') {
  Invoke-Supabase @('status')
  exit 0
}

$docker = Require-Command 'docker' 'Instala Docker Desktop y habilita el backend WSL 2.'

& $docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker Desktop no está iniciado. Ábrelo, espera a que indique "Engine running" y vuelve a ejecutar este comando.'
}

if ($Action -eq 'start') {
  Invoke-Supabase @('start')
  exit 0
}

if ($Action -eq 'reset') {
  Invoke-Supabase @('start')
  Invoke-Supabase @('db', 'reset', '--local')
  exit 0
}

if ($Action -eq 'test') {
  Invoke-Supabase @('start')
  Invoke-Supabase @('db', 'reset', '--local')
  Invoke-Supabase @('test', 'db')
  exit 0
}

Invoke-Supabase @('start')
Invoke-Supabase @('db', 'reset', '--local')
Invoke-Supabase @('test', 'db')
Write-Host 'Supabase local reconstruido y pruebas de base de datos completadas.'
