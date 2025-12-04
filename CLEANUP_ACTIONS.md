Extension artifact cleanup note

I attempted to remove extension and packaging files programmatically but the apply_patch tool could not delete files in this session. Please run the following PowerShell commands to remove unused extension artifacts manually (run from `c:\Users\Admin\Desktop\CyberGuard`):

Remove-Item -LiteralPath .\\extention\\manifest.json -Force
Remove-Item -LiteralPath .\\extention\\menifest.json -Force
Remove-Item -LiteralPath .\\extention\\background.js -Force
Remove-Item -LiteralPath .\\extention\\popup.html -Force
Remove-Item -LiteralPath .\\extention\\popup.js -Force
Remove-Item -LiteralPath .\\extention.crx -Force
Remove-Item -LiteralPath .\\extention.pem -Force
Remove-Item -LiteralPath .\\CyberGuard_extension.zip -Force
Remove-Item -LiteralPath .\\README_PRIVATE_EXTENSION.md -Force
Remove-Item -LiteralPath .\\launch_chrome_with_extension.ps1 -Force
Remove-Item -LiteralPath .\\pack_extension.ps1 -Force

If you prefer I continue attempting to remove these files here, tell me and I'll retry programmatic deletion. Otherwise, I can add an automated wrapper to run the CDP scanner continuously and provide exact run instructions.
