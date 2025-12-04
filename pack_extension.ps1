# Pack CyberGuard extension into a .crx using local Chrome
# This script will attempt to find Chrome and run --pack-extension to create a .crx and a private key (.pem)

$extPath = "C:\Users\Admin\Desktop\CyberGuard\extention"
$keyPath = "C:\Users\Admin\Desktop\CyberGuard\cyberguard_key.pem"
$possible = @(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe"
)
$chromePath = $possible | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not (Test-Path $extPath)) {
    Write-Error "Extension folder not found at $extPath"
    exit 1
}

if (-not $chromePath) {
    Write-Error "Google Chrome executable not found in default locations.\nPlease pack the extension using Chrome GUI: Open chrome://extensions/ -> Pack extension -> select extension folder."
    exit 1
}

Write-Host "Found Chrome at: $chromePath"
Write-Host "Packing extension: $extPath"
Write-Host "Key file: $keyPath"

# If key exists, use it; otherwise Chrome will create it.
$packArgs = "--pack-extension=$extPath"
if (Test-Path $keyPath) { $packArgs += " --pack-extension-key=$keyPath" }

Write-Host "Running: $chromePath $packArgs"
# Run Chrome pack command
$proc = Start-Process -FilePath $chromePath -ArgumentList $packArgs -Wait -PassThru

# After packing, Chrome writes a .crx file into the parent directory of the extension
$extName = Split-Path $extPath -Leaf
$crxCandidate1 = Join-Path (Split-Path $extPath -Parent) ("$extName.crx")
$crxCandidate2 = Join-Path $extPath ("$extName.crx")

if (Test-Path $crxCandidate1) {
    Write-Host "CRX created: $crxCandidate1"
} elseif (Test-Path $crxCandidate2) {
    Write-Host "CRX created: $crxCandidate2"
} else {
    Write-Warning "CRX file not found automatically. Check Chrome output and extension folder for .crx and .pem files."
}

Write-Host "Done. If a .pem key was not present, Chrome will have created a key file in the extension folder or next to the .crx."