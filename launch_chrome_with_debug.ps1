# Launch Chrome with remote debugging enabled on port 9222 (isolated profile)
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$userData = "$env:USERPROFILE\AppData\Local\Temp\cyberguard_chrome_debug_profile"

if (-Not (Test-Path $chromePath)) {
  Write-Error "Chrome not found at $chromePath. Update path in this script."
  exit 1
}

if (Test-Path $userData) { Remove-Item -Force -Recurse $userData }
New-Item -ItemType Directory -Path $userData | Out-Null

Start-Process -FilePath $chromePath -ArgumentList "--user-data-dir=$userData","--remote-debugging-port=9222" -NoNewWindow
Write-Host "Chrome launched with remote debugging on port 9222 (profile: $userData)"