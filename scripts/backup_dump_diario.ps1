# ==============================================================================
# JP3D ERP Industrial (Cotalis) — Rotina Automatizada de Dump Diário Offsite
# ==============================================================================
# Executa snapshot completo dos dados do banco, compacta em ZIP, gera hash
# criptográfico SHA-256 e envia para o diretório offsite / provedor externo.
# ==============================================================================

param(
    [string]$CustomOffsiteDir = "",
    [switch]$Silencioso = $false
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BaseDir = Split-Path -Parent $ScriptDir
if (-not $BaseDir) { $BaseDir = "C:\ERP Gestao" }

$ConfigFile = Join-Path $ScriptDir "backup_config.json"
$Config = $null

if (Test-Path $ConfigFile) {
    try {
        $Config = Get-Content $ConfigFile -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        Write-Warning "Falha ao ler backup_config.json. Usando configurações padrão."
    }
}

# Configurações padrão caso o JSON falhe
$LocalDir = if ($Config -and $Config.backupLocalDir) { $Config.backupLocalDir } else { "$BaseDir\backups\daily" }
$OffsiteDir = if ($CustomOffsiteDir) { $CustomOffsiteDir } elseif ($Config -and $Config.backupOffsiteDir) { $Config.backupOffsiteDir } else { "$BaseDir\backups_offsite" }
$RetencaoDias = if ($Config -and $Config.retencaoDias) { [int]$Config.retencaoDias } else { 30 }

# Detecção automática de provedor em nuvem externo (OneDrive, Google Drive, Dropbox)
if ($Config -and $Config.autoDetectCloudSync) {
    $CloudCandidates = @(
        "$env:USERPROFILE\OneDrive\JP3D_ERP_Backups",
        "$env:USERPROFILE\Google Drive\JP3D_ERP_Backups",
        "$env:USERPROFILE\Dropbox\JP3D_ERP_Backups",
        "D:\JP3D_ERP_Backups_Offsite",
        "E:\JP3D_ERP_Backups_Offsite"
    )

    foreach ($Candidate in $CloudCandidates) {
        $Parent = Split-Path -Parent $Candidate
        if (Test-Path $Parent) {
            $OffsiteDir = $Candidate
            break
        }
    }
}

# Garantir existência dos diretórios
if (-not (Test-Path $LocalDir)) { New-Item -ItemType Directory -Path $LocalDir -Force | Out-Null }
if (-not (Test-Path $OffsiteDir)) { New-Item -ItemType Directory -Path $OffsiteDir -Force | Out-Null }

$LogFile = Join-Path $BaseDir "backups\backup_execution.log"
$LogDir = Split-Path -Parent $LogFile
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Write-Log([string]$Msg) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Line = "[$Timestamp] $Msg"
    Add-Content -Path $LogFile -Value $Line -Encoding UTF8
    if (-not $Silencioso) {
        Write-Host $Line
    }
}

Write-Log "=========================================================="
Write-Log "INICIANDO ROTINA DE DUMP DIÁRIO DO BANCO JP3D ERP"
Write-Log "Destino Local:   $LocalDir"
Write-Log "Destino Offsite: $OffsiteDir"

$DateStr = Get-Date -Format "yyyy-MM-dd_HHmmss"
$DumpPrefix = "jp3d_erp_dump_$DateStr"
$TempDumpDir = Join-Path $env:TEMP $DumpPrefix
New-Item -ItemType Directory -Path $TempDumpDir -Force | Out-Null

try {
    # 1. Coleta e exportação de dados do banco
    # Verifica fontes de dados: SQLite local data.db, localStorage cache e html
    $SqliteDbPath = Join-Path $BaseDir "data.db"
    $CotalisHtml = Join-Path $BaseDir "cotalis.html"
    $StateJsonPath = Join-Path $BaseDir "backups\current_state.json"

    $DumpManifest = @{
        empresa = "JP3D INDUSTRIA E COMERCIO LTDA"
        cnpj = "50.746.777/0001-78"
        dataHora = (Get-Date).ToString("o")
        versaoSchema = 3
        arquivos = @()
    }

    if (Test-Path $SqliteDbPath) {
        Copy-Item -Path $SqliteDbPath -Destination (Join-Path $TempDumpDir "data.db") -Force
        $DumpManifest.arquivos += "data.db"
        Write-Log "Snapshot SQLite 'data.db' capturado."
    }

    if (Test-Path $StateJsonPath) {
        Copy-Item -Path $StateJsonPath -Destination (Join-Path $TempDumpDir "db_snapshot.json") -Force
        $DumpManifest.arquivos += "db_snapshot.json"
        Write-Log "Snapshot JSON 'db_snapshot.json' capturado."
    } elseif (Test-Path $CotalisHtml) {
        # Extrair dados de semente/estrutura
        Copy-Item -Path $CotalisHtml -Destination (Join-Path $TempDumpDir "cotalis.html") -Force
        $DumpManifest.arquivos += "cotalis.html"
    }

    # Salvar Manifesto
    $ManifestJson = $DumpManifest | ConvertTo-Json -Depth 5
    Set-Content -Path (Join-Path $TempDumpDir "manifest.json") -Value $ManifestJson -Encoding UTF8

    # 2. Compactação em ZIP único
    $ZipLocalPath = Join-Path $LocalDir "$DumpPrefix.zip"
    if (Test-Path $ZipLocalPath) { Remove-Item $ZipLocalPath -Force }
    
    Compress-Archive -Path "$TempDumpDir\*" -DestinationPath $ZipLocalPath -CompressionLevel Optimal
    Write-Log "Arquivo compactado com sucesso: $ZipLocalPath"

    # 3. Geração de Hash Criptográfico SHA-256
    $Sha256 = (Get-FileHash -Path $ZipLocalPath -Algorithm SHA256).Hash
    $ChecksumPath = "$ZipLocalPath.sha256"
    Set-Content -Path $ChecksumPath -Value "$Sha256  $DumpPrefix.zip" -Encoding UTF8
    Write-Log "Checksum SHA-256 gerado: $Sha256"

    # 4. Envio / Replicação para Destino Offsite (Fora do Provedor)
    $ZipOffsitePath = Join-Path $OffsiteDir "$DumpPrefix.zip"
    $ChecksumOffsitePath = Join-Path $OffsiteDir "$DumpPrefix.zip.sha256"
    
    Copy-Item -Path $ZipLocalPath -Destination $ZipOffsitePath -Force
    Copy-Item -Path $ChecksumPath -Destination $ChecksumOffsitePath -Force
    Write-Log "DUMP OFFSITE TRANSMITIDO COM SUCESSO: $ZipOffsitePath"

    # Salvar ponteiro de último backup com sucesso
    $LatestInfo = @{
        ultimoDump = (Get-Date).ToString("o")
        arquivoLocal = $ZipLocalPath
        arquivoOffsite = $ZipOffsitePath
        sha256 = $Sha256
        tamanhoBytes = (Get-Item $ZipLocalPath).Length
        status = "SUCESSO"
    } | ConvertTo-Json
    Set-Content -Path (Join-Path $BaseDir "backups\last_dump.json") -Value $LatestInfo -Encoding UTF8

    # 5. Rotação de dumps antigos (Retenção)
    $DataLimite = (Get-Date).AddDays(-$RetencaoDias)
    $DumpsLocaisAntigos = Get-ChildItem -Path $LocalDir -Filter "jp3d_erp_dump_*.zip*" | Where-Object { $_.CreationTime -lt $DataLimite }
    foreach ($Antigo in $DumpsLocaisAntigos) {
        Remove-Item $Antigo.FullName -Force
        Write-Log "Removido dump local expirado (> $RetencaoDias dias): $($Antigo.Name)"
    }

    $DumpsOffsiteAntigos = Get-ChildItem -Path $OffsiteDir -Filter "jp3d_erp_dump_*.zip*" | Where-Object { $_.CreationTime -lt $DataLimite }
    foreach ($Antigo in $DumpsOffsiteAntigos) {
        Remove-Item $Antigo.FullName -Force
        Write-Log "Removido dump offsite expirado (> $RetencaoDias dias): $($Antigo.Name)"
    }

    Write-Log "ROTINA DE DUMP DIÁRIO CONCLUÍDA COM 100% DE SUCESSO."
    Write-Log "=========================================================="

} catch {
    Write-Log "ERRO CRÍTICO NA ROTINA DE DUMP: $_"
    throw $_
} finally {
    if (Test-Path $TempDumpDir) {
        Remove-Item -Path $TempDumpDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
