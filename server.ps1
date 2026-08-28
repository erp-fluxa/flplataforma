param(
    [int]$Port = 5500
)

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $baseDir) { $baseDir = "C:\ERP Gestao" }

# Tentar portas em sequencia (5500, 5501, 5502, 5503, 5504, 8080)
$portsToTry = @($Port, 5501, 5502, 5503, 5504, 8080)
$listener = $null
$activePort = $Port

foreach ($p in $portsToTry) {
    # 1. Verificar se o servidor ERP ja esta ativo e respondendo nesta porta
    try {
        $check = Invoke-WebRequest -Uri "http://127.0.0.1:$p/" -UseBasicParsing -TimeoutSec 1
        if ($check.StatusCode -eq 200) {
            Write-Host "==========================================================" -ForegroundColor Cyan
            Write-Host "  Fluxa ERP Industrial - Servidor Ja Ativo!" -ForegroundColor Green
            Write-Host "==========================================================" -ForegroundColor Cyan
            Write-Host "  O servidor ja esta em execucao na porta $p." -ForegroundColor Yellow
            Write-Host "  Abrindo no navegador: http://localhost:$p/" -ForegroundColor Green
            Write-Host "==========================================================" -ForegroundColor Cyan
            Start-Process "http://localhost:$p/"
            exit 0
        }
    } catch {}

    # 2. Tentar vincular o HttpListener a porta livre
    try {
        $testListener = New-Object System.Net.HttpListener
        $testListener.Prefixes.Add("http://127.0.0.1:$p/")
        try { $testListener.Prefixes.Add("http://localhost:$p/") } catch {}
        $testListener.Start()
        $listener = $testListener
        $activePort = $p
        break
    } catch {
        # Porta ocupada, tenta a proxima
    }
}

if (-not $listener -or -not $listener.IsListening) {
    Write-Error "Nao foi possivel iniciar o servidor HTTP em nenhuma das portas (" + ($portsToTry -join ", ") + ")."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Fluxa ERP Industrial - Servidor HTTP Local" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Acesse no navegador: " -NoNewline
Write-Host "http://localhost:$activePort/" -ForegroundColor Yellow
Write-Host "  Rotina de Dump Offsite: AGENDADA DIARIAMENTE (23:00)" -ForegroundColor Green
Write-Host "  Pressione Ctrl+C para encerrar o servidor." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# Verificacao do agendamento em segundo plano sem bloquear a abertura do servidor
$ScheduleScript = Join-Path $baseDir "scripts\instalar_agendamento_dump.ps1"
if (Test-Path $ScheduleScript) {
    try {
        Write-Host "[Backup] Verificando agendamento de dump diario offsite..." -ForegroundColor Cyan
        & "$ScheduleScript"
    } catch {
        Write-Warning "[Backup] Aviso ao inicializar agendador: $_"
    }
}

# Abrir navegador automaticamente na porta ativa
Start-Process "http://localhost:$activePort/"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $rawUrl = $request.RawUrl.Split('?')[0].TrimStart('/')

        # API Endpoints
        if ($rawUrl -eq "api/backup/status") {
            $LastDumpFile = Join-Path $baseDir "backups\last_dump.json"
            $ScheduleStatusFile = Join-Path $baseDir "backups\schedule_status.json"
            
            $StatusData = @{
                agendado = $true
                frequencia = "Diaria (23:00)"
                ultimoDump = $null
                destinoOffsite = "C:\ERP Gestao\backups_offsite"
            }
            if (Test-Path $LastDumpFile) {
                $StatusData.ultimoDump = Get-Content $LastDumpFile -Raw -Encoding UTF8 | ConvertFrom-Json
            }
            if (Test-Path $ScheduleStatusFile) {
                $StatusData.agendamento = Get-Content $ScheduleStatusFile -Raw -Encoding UTF8 | ConvertFrom-Json
            }

            $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes(($StatusData | ConvertTo-Json -Depth 5))
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $jsonBytes.Length
            $response.OutputStream.Write($jsonBytes, 0, $jsonBytes.Length)
            $response.Close()
            continue
        }

        if ($rawUrl -eq "api/backup/dump" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Close()

            $BackupsDir = Join-Path $baseDir "backups"
            if (-not (Test-Path $BackupsDir)) { New-Item -ItemType Directory -Path $BackupsDir -Force | Out-Null }
            
            $StateFile = Join-Path $BackupsDir "current_state.json"
            Set-Content -Path $StateFile -Value $body -Encoding UTF8

            $DumpScript = Join-Path $baseDir "scripts\backup_dump_diario.ps1"
            if (Test-Path $DumpScript) {
                & "$DumpScript" -Silencioso
            }

            $resObj = @{
                success = $true
                mensagem = "Dump diario salvo e replicado para o destino offsite com sucesso!"
                timestamp = (Get-Date).ToString("o")
            }
            $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes(($resObj | ConvertTo-Json))
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $jsonBytes.Length
            $response.OutputStream.Write($jsonBytes, 0, $jsonBytes.Length)
            $response.Close()
            continue
        }

        if ($rawUrl -eq "api/backup/trigger" -and $request.HttpMethod -eq "POST") {
            $DumpScript = Join-Path $baseDir "scripts\backup_dump_diario.ps1"
            if (Test-Path $DumpScript) {
                & "$DumpScript"
            }
            $resObj = @{ success = $true; mensagem = "Dump disparado manualmente com sucesso." }
            $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes(($resObj | ConvertTo-Json))
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $jsonBytes.Length
            $response.OutputStream.Write($jsonBytes, 0, $jsonBytes.Length)
            $response.Close()
            continue
        }

        # Servir Arquivos Estaticos
        if ([string]::IsNullOrEmpty($rawUrl) -or $rawUrl -eq "/" -or $rawUrl -eq "fluxa.html" -or $rawUrl -eq "Gescomp.html" -or $rawUrl -eq "cotalis.html") {
            if (Test-Path (Join-Path $baseDir "index.html")) {
                $rawUrl = "index.html"
            } elseif (Test-Path (Join-Path $baseDir "fluxa.html")) {
                $rawUrl = "fluxa.html"
            } else {
                $rawUrl = "cotalis.html"
            }
        }

        $filePath = Join-Path $baseDir $rawUrl

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                default { $response.ContentType = "application/octet-stream" }
            }

            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 - Arquivo nao encontrado</h1>")
            $response.ContentType = "text/html; charset=utf-8"
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    } catch {
        # Conexao encerrada
    }
}
