# tools/cleanup_extension_files.ps1
# Cleans up extension and packaging artifacts for website-only workflow.
# Run from project root (C:\Users\Admin\Desktop\CyberGuard)

$paths = @(
    ".\extention\manifest.json",
    ".\extention\menifest.json",
    ".\extention\background.js",
    ".\extention\popup.html",
    ".\extention\popup.js",
    ".\extention.crx",
    ".\extention.pem",
    ".\CyberGuard_extension.zip",
    ".\README_PRIVATE_EXTENSION.md",
    ".\launch_chrome_with_extension.ps1",
    ".\pack_extension.ps1"
)

Write-Host "Cleaning up extension artifacts..." -ForegroundColor Cyan
foreach ($p in $paths) {
    if (Test-Path $p) {
        try {
            Remove-Item -LiteralPath $p -Force -ErrorAction Stop
            Write-Host "Removed: $p" -ForegroundColor Green
        } catch {
            Write-Host "Failed to remove: $p — $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Not found: $p" -ForegroundColor DarkGray
    }
}

# Optionally remove the extention folder if empty
$extFolder = ".\extention"
if (Test-Path $extFolder) {
    try {
        $children = Get-ChildItem -Path $extFolder -Force | Where-Object { -not $_.PSIsContainer }
        if ($children.Count -eq 0) {
            Remove-Item -LiteralPath $extFolder -Force -Recurse
            Write-Host "Removed empty folder: $extFolder" -ForegroundColor Green
        } else {
            Write-Host "Folder not empty, skipping removal: $extFolder" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error checking/removing folder: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "Cleanup script finished." -ForegroundColor Cyan
