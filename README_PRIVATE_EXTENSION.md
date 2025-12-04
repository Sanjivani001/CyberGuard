Using CyberGuard extension privately (single Chrome)

Overview
- This creates a ZIP of the extension folder so you can keep it private on your machine.
- Two ways to use it privately:
  1) Load unpacked extension in Developer Mode (recommended)
  2) Launch a dedicated Chrome profile with the extension loaded via `--load-extension` (isolated, private)

Files created
- `CyberGuard_extension.zip` — ZIP of `extention/` (in project root)
- `launch_chrome_with_extension.ps1` — PowerShell script that opens Chrome with a private profile and the extension loaded

Load unpacked (manual)
1. Open Chrome (or Edge)
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (top-right)
4. Click **Load unpacked** and select `C:\Users\Admin\Desktop\CyberGuard\extention`
5. Ensure the extension is enabled. It will only be active in this browser profile.

Launch Chrome with extension only (isolated)
1. Edit `launch_chrome_with_extension.ps1` if your Chrome path differs.
2. Run in PowerShell (example):
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
   .\launch_chrome_with_extension.ps1
   ```
3. This script creates a fresh `user-data` directory (isolated) and loads the extension via `--load-extension` so it doesn't affect your default profile.

Notes
- This extension is local and doesn't get distributed unless you share the ZIP. Keep the ZIP in a secure place.
- If you want a packaged `.crx` signed for private distribution, that requires a private key and additional steps — I can help if you want.
