# Ejecucion manual de ZAP — equivalente al YAML pero paso a paso
# Uso: desde la raiz del repo → .\tests\zap\ejecutar_zap.ps1

$ZAP_PORT  = 8090
$API_BASE  = "http://localhost:$ZAP_PORT"
$TARGET    = "http://host.docker.internal:4000"
$ZAP_NAME  = "zap-libroclaro"

# ─────────────────────────────────────────────────────────────
# PASO 1: Iniciar ZAP en modo daemon dentro de Docker
# ─────────────────────────────────────────────────────────────
Write-Host "`n[1/7] Iniciando ZAP en modo daemon (puerto $ZAP_PORT)..."

docker rm -f $ZAP_NAME 2>$null | Out-Null

$volumen = "${PWD}\tests\zap:/zap/wrk/:rw"
docker run -d --name $ZAP_NAME `
    -p "${ZAP_PORT}:${ZAP_PORT}" `
    -v $volumen `
    ghcr.io/zaproxy/zaproxy:stable `
    zap.sh -daemon -port $ZAP_PORT -host 0.0.0.0 `
    -config api.disablekey=true `
    "-config" "api.addrs.addr.name=.*" `
    "-config" "api.addrs.addr.regex=true" | Out-Null

# ─────────────────────────────────────────────────────────────
# PASO 2: Esperar a que ZAP arranque (max 60s)
# ─────────────────────────────────────────────────────────────
Write-Host "[2/7] Esperando que ZAP arranque..."

$listo = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $ver = Invoke-RestMethod "$API_BASE/JSON/core/view/version/" -ErrorAction Stop
        Write-Host "      ZAP listo — version $($ver.version)"
        $listo = $true
        break
    } catch {}
    Write-Host "      Intento $i/30..."
}

if (-not $listo) {
    Write-Host "ERROR: ZAP no arranco. Revisa: docker logs $ZAP_NAME"
    exit 1
}

# ─────────────────────────────────────────────────────────────
# PASO 3: Crear contexto e incluir la URL del API
# ─────────────────────────────────────────────────────────────
Write-Host "[3/7] Configurando contexto LibroClaro..."

$urlCtx = "$API_BASE/JSON/context/action/newContext/?contextName=LibroClaro"
$ctx = Invoke-RestMethod $urlCtx
$contextId = $ctx.contextId
Write-Host "      Contexto creado (ID: $contextId)"

$regex = [Uri]::EscapeDataString("$TARGET/api/.*")
$urlInc = "$API_BASE/JSON/context/action/includeInContext/?contextName=LibroClaro&regex=$regex"
Invoke-RestMethod $urlInc | Out-Null
Write-Host "      Incluido: $TARGET/api/.*"

# ─────────────────────────────────────────────────────────────
# PASO 4: Spider (descubrir rutas)
# ─────────────────────────────────────────────────────────────
Write-Host "[4/7] Ejecutando spider desde $TARGET/api/health..."

$urlSpider = "$API_BASE/JSON/spider/action/scan/?url=$TARGET/api/health&contextName=LibroClaro&recurse=true"
$spider    = Invoke-RestMethod $urlSpider
$spiderId  = $spider.scan

do {
    Start-Sleep -Seconds 2
    $pct = (Invoke-RestMethod "$API_BASE/JSON/spider/view/status/?scanId=$spiderId").status
    Write-Host "      Spider: $pct%"
} while ([int]$pct -lt 100)

$urls = (Invoke-RestMethod "$API_BASE/JSON/spider/view/results/?scanId=$spiderId").results
Write-Host "      URLs descubiertas: $($urls.Count)"

# ─────────────────────────────────────────────────────────────
# PASO 5: Registrar endpoints REST manualmente
# ─────────────────────────────────────────────────────────────
Write-Host "[5/7] Registrando endpoints del API..."

# Comilla simple escapada con '' dentro de single-quoted string de PowerShell
$sqliBody = '{"email":"'' OR 1=1--","password":"x"}'

$endpoints = @(
    @{ method = "GET";  url = "$TARGET/api/books" },
    @{ method = "GET";  url = "$TARGET/api/auth/me" },
    @{ method = "GET";  url = "$TARGET/api/subscriptions/status" },
    @{ method = "GET";  url = "$TARGET/api/editors" },
    @{ method = "GET";  url = "$TARGET/api/books/1/annotations?page=1" },
    @{ method = "POST"; url = "$TARGET/api/auth/login"
       body = '{"email":"docente01@libroclaro.test","password":"docente1234"}' },
    @{ method = "POST"; url = "$TARGET/api/auth/login"; body = $sqliBody }
)

foreach ($ep in $endpoints) {
    $body = if ($ep.body) { $ep.body } else { "" }
    $raw  = "$($ep.method) $($ep.url) HTTP/1.1`r`nHost: host.docker.internal:4000`r`nContent-Type: application/json`r`n`r`n$body"

    try {
        Invoke-RestMethod "$API_BASE/JSON/core/action/sendRequest/" `
            -Method Post `
            -Body @{ request = $raw } | Out-Null
    } catch {}

    Write-Host "      -> $($ep.method) $($ep.url)"
}

# ─────────────────────────────────────────────────────────────
# PASO 6: Active Scan
# ─────────────────────────────────────────────────────────────
Write-Host "[6/7] Ejecutando active scan (puede tardar varios minutos)..."

$urlAscan = "$API_BASE/JSON/ascan/action/scan/?url=$TARGET/api&contextName=LibroClaro&recurse=true"
$ascan    = Invoke-RestMethod $urlAscan
$ascanId  = $ascan.scan

$ultimo = -1
do {
    Start-Sleep -Seconds 5
    $pct = (Invoke-RestMethod "$API_BASE/JSON/ascan/view/status/?scanId=$ascanId").status
    if ([int]$pct -ne $ultimo) {
        Write-Host "      Active scan: $pct%"
        $ultimo = [int]$pct
    }
} while ([int]$pct -lt 100)

$alertas = (Invoke-RestMethod "$API_BASE/JSON/core/view/alerts/").alerts
Write-Host "`n      Alertas encontradas: $($alertas.Count)"
$alertas | Group-Object risk | Sort-Object Name | ForEach-Object {
    Write-Host "        $($_.Name.PadRight(10)) : $($_.Count)"
}

# ─────────────────────────────────────────────────────────────
# PASO 7: Generar reporte HTML y apagar ZAP
# ─────────────────────────────────────────────────────────────
Write-Host "[7/7] Generando reporte..."

$urlReport = "$API_BASE/JSON/reports/action/generate/?title=LibroClaro&template=traditional-html&reportDir=/zap/wrk/resultados&reportFileName=reporte_manual.html"
Invoke-RestMethod $urlReport | Out-Null

Write-Host "      Reporte: tests\zap\resultados\reporte_manual.html"

docker stop $ZAP_NAME | Out-Null
docker rm   $ZAP_NAME | Out-Null

$reportPath = Join-Path (Get-Location).Path "tests\zap\resultados\reporte_manual.html"
Write-Host "`nListo. Abriendo reporte..."
Start-Process $reportPath
