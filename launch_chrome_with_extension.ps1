# Launch Chrome with CyberGuard extension loaded in an isolated profile
# Edit $chromePath if your Chrome is installed elsewhere

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$extPath = "C:\Users\Admin\Desktop\CyberGuard\extention"
$userData = "$env:USERPROFILE\AppData\Local\Temp\cyberguard_chrome_profile"

Write-Host "Using Chrome: $chromePath"
Write-Host "Extension path: $extPath"
Write-Host "User profile: $userData"

if (-Not (Test-Path $chromePath)) {
    Write-Error "Chrome executable not found at $chromePath. Update the script with correct path."
    exit 1
}

# Ensure isolated profile directory exists
if (Test-Path $userData) { Remove-Item -Recurse -Force $userData }
New-Item -ItemType Directory -Path $userData | Out-Null

# Launch Chrome with extension loaded
Start-Process -FilePath $chromePath -ArgumentList "--user-data-dir=$userData","--load-extension=$extPath","--disable-extensions-except=$extPath" -NoNewWindow

Write-Host "Chrome launched with CyberGuard extension in isolated profile."