<#
tools/run_cdp_scanner.ps1

Launches Chrome with --remote-debugging-port and runs the Node CDP scanner in a loop.

Usage examples (run from project root):

# Run once, start Chrome if needed, report results to backend
powershell -ExecutionPolicy Bypass -File .\tools\run_cdp_scanner.ps1 -RunOnce -Report

# Run continuously every 30 seconds (default)
powershell -ExecutionPolicy Bypass -File .\tools\run_cdp_scanner.ps1 -IntervalSeconds 30 -Report

# Use a custom Chrome path
powershell -ExecutionPolicy Bypass -File .\tools\run_cdp_scanner.ps1 -ChromePath "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"

# Notes:
# - Backend must be running (default localhost:5000) so the scanner can POST to /api/scan-url-v2
# - This script creates a temporary user-data-dir at .\\cdp-profile (isolated profile)
# - Requires Node.js available on PATH
#
param(
    [int]$IntervalSeconds = 30,
    [string]$ChromePath = "",
    [string]$UserDataDir = "$PSScriptRoot\\..\\cdp-profile",
    [switch]$RunOnce,
    [switch]$Report
)

function Find-Chrome {
    param()
    $candidates = @( 
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

if (-not $ChromePath) {
    $ChromePath = Find-Chrome
    if (-not $ChromePath) {
        Write-Host "Chrome not found in common locations. Please provide -ChromePath to the browser executable." -ForegroundColor Yellow
        exit 2
    }
}

# Ensure user-data-dir exists
if (-not (Test-Path $UserDataDir)) { New-Item -ItemType Directory -Path $UserDataDir | Out-Null }

$chromeArgs = "--remote-debugging-port=9222 --user-data-dir=\"$UserDataDir\" --no-first-run --no-default-browser-check --disable-background-networking --disable-background-timer-throttling"

# Start Chrome if not already listening on 9222
function Test-DevToolsListening {
    try {
        $resp = Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:9222/json/list -TimeoutSec 2 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

if (-not (Test-DevToolsListening)) {
    Write-Host "Starting Chrome with remote debugging..." -ForegroundColor Cyan
    Start-Process -FilePath $ChromePath -ArgumentList $chromeArgs -WindowStyle Minimized | Out-Null
    Start-Sleep -Seconds 2
    # wait for DevTools
    $tries = 0
    while (-not (Test-DevToolsListening) -and $tries -lt 15) {
        Start-Sleep -Seconds 1
        $tries++
    }
    if (-not (Test-DevToolsListening)) {
        Write-Host "Chrome did not start with remote debugging on port 9222. Exiting." -ForegroundColor Red
        exit 3
    }
} else {
    Write-Host "Chrome is already running with remote debugging enabled." -ForegroundColor Green
}

# Build node command
$nodeCmd = "node"
$scriptPath = Join-Path $PSScriptRoot "scan_tabs_cdp.js"
if (-not (Test-Path $scriptPath)) {
    Write-Host "CDP scanner script not found at $scriptPath" -ForegroundColor Red
    exit 4
}

$reportFlag = $Report.IsPresent ? "--report" : ""

Write-Host "Starting CDP scanner loop. Interval: $IntervalSeconds seconds. Reporting: $($Report.IsPresent)" -ForegroundColor Cyan

do {
    Write-Host "Running scan_tabs_cdp.js at $(Get-Date -Format o)" -ForegroundColor DarkCyan
    $args = @($scriptPath)
    if ($reportFlag) { $args += $reportFlag }
    $p = Start-Process -FilePath $nodeCmd -ArgumentList $args -NoNewWindow -Wait -PassThru
    if ($p.ExitCode -ne 0) {
        Write-Host "CDP scanner exited with code $($p.ExitCode). Will retry after delay." -ForegroundColor Yellow
    }
    if ($RunOnce) { break }
    Start-Sleep -Seconds $IntervalSeconds
} while ($true)

Write-Host "CDP scanner loop ended." -ForegroundColor Green
