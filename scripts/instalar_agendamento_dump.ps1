# ==============================================================================
# JP3D ERP Industrial — Instalador do Agendamento Diário do Dump Offsite
# ==============================================================================
# Registra uma Tarefa Agendada no Windows para executar todos os dias às 23:00
# o script de dump do banco para fora do provedor.
# ==============================================================================

param(
    [string]$Horario = "23:00",
    [switch]$Forcar = $true
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BaseDir = Split-Path -Parent $ScriptDir
if (-not $BaseDir) { $BaseDir = "C:\ERP Gestao" }

$TaskName = "JP3D_ERP_Dump_Diario_Offsite"
$ScriptPath = Join-Path $ScriptDir "backup_dump_diario.ps1"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Configurando Agendamento Automático de Dump Diário" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Tarefa:     $TaskName" -ForegroundColor Yellow
Write-Host "Horário:    Diariamente às $Horario" -ForegroundColor Yellow
Write-Host "Script:     $ScriptPath" -ForegroundColor Yellow

try {
    # Usar cmdlet nativo do PowerShell para registrar no Windows Scheduler
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" -Silencioso"
    $TimeObj = Get-Date $Horario
    $Trigger = New-ScheduledTaskTrigger -Daily -At $TimeObj

    # Registrar tarefa para o usuário ativo sem requerer privilégios de sistema
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -User $env:USERNAME -Force | Out-Null
    Write-Host "SUCESSO: Tarefa de dump diário offsite agendada com sucesso!" -ForegroundColor Green
    
    # Salvar status do agendamento
    $Status = @{
        agendado = $true
        nomeTarefa = $TaskName
        horario = $Horario
        criadoEm = (Get-Date).ToString("o")
        frequencia = "DIÁRIA"
        scriptExecutavel = $ScriptPath
        statusAgendador = "ATIVO"
    } | ConvertTo-Json
    
    $BackupsMetaDir = Join-Path $BaseDir "backups"
    if (-not (Test-Path $BackupsMetaDir)) { New-Item -ItemType Directory -Path $BackupsMetaDir -Force | Out-Null }
    Set-Content -Path (Join-Path $BackupsMetaDir "schedule_status.json") -Value $Status -Encoding UTF8
} catch {
    Write-Warning "Aviso ao agendar tarefa: $_"
}

# Executar primeiro dump imediatamente para garantir baseline desde o primeiro dia
Write-Host "Executando dump de baseline (Primeiro Dia)..." -ForegroundColor Cyan
try {
    & "$ScriptPath"
    Write-Host "Baseline do primeiro dia criada e transmitida offsite com sucesso!" -ForegroundColor Green
} catch {
    Write-Warning "Falha ao rodar dump de baseline: $_"
}

Write-Host "==========================================================" -ForegroundColor Cyan
