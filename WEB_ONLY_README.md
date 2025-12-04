Website-only workflow (scan open Chrome tabs locally)

Prereqs:
- Node.js installed and on PATH
- Backend running (from project root): `node backend/server.js` (default port 5000)

Steps:
1. Start Chrome with remote debugging and isolated profile (the wrapper will start it if needed):

   powershell -ExecutionPolicy Bypass -File .\tools\run_cdp_scanner.ps1 -IntervalSeconds 30 -Report

   - This launches Chrome (if not already running) with `--remote-debugging-port=9222` and runs `tools/scan_tabs_cdp.js` every 30 seconds, posting results to `/api/report-open-tabs`.
   - Use `-RunOnce` to run a single scan instead of a loop.

2. Open the dashboard in your browser (e.g., http://localhost:5000/) — the dashboard polls `/api/tabs` every 5s and will show reported tabs and risk scores.

Manual deletion of extension artifacts:
If you want to delete leftover extension files manually, run these PowerShell commands from the project root:

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

If you want me to try deleting these programmatically, tell me and I'll retry.
