# CyberGuard Browser Extension - Setup & Usage Guide

## ✅ Prerequisites
- **Backend Running**: Node.js server should be running on `http://localhost:5000`
- **Browser**: Chrome, Edge, or any Chromium-based browser
- **Extension Files**: Located in `extention/` folder:
  - `manifest.json` ✓
  - `background.js` ✓
  - `popup.html` ✓
  - `popup.js` ✓

---

## 📋 Step 1: Load the Extension in Chrome/Edge

### Option A: Chrome Browser
1. **Open Chrome** → Click the three dots menu (⋮) in top-right
2. Select **Settings** → **Extensions** on the left sidebar
3. Or directly navigate to: `chrome://extensions/`
4. **Enable "Developer mode"** toggle in top-right corner
5. Click **"Load unpacked"** button that appears
6. Navigate to: `C:\Users\Admin\Desktop\CyberGuard\extention`
7. Click **"Select Folder"**
8. ✅ Extension is now loaded!

### Option B: Microsoft Edge Browser
1. **Open Edge** → Click the three dots menu (⋮) in top-right
2. Select **Extensions** → **Manage extensions**
3. Or directly navigate to: `edge://extensions/`
4. **Enable "Developer mode"** toggle at bottom-left
5. Click **"Load unpacked"** button that appears
6. Navigate to: `C:\Users\Admin\Desktop\CyberGuard\extention`
7. Click **"Select Folder"**
8. ✅ Extension is now loaded!

---

## 🎯 Step 2: Verify Extension is Loaded

After loading, you should see:
- **CyberGuard Auto Scanner** in the extensions list
- Extension ID displayed (e.g., `abcdefg123456...`)
- Status: **"Enabled"**
- A **CyberGuard icon** will appear in your browser toolbar (top-right area)

---

## 🔍 Step 3: Use the Extension to Scan Tabs

### Automatic Scan on Install
When the extension first loads, it automatically scans all currently open tabs and reports them to the backend.

### Manual Scan Anytime
1. **Open multiple tabs** in your browser with any websites (e.g., google.com, github.com, any site)
2. **Click the CyberGuard icon** in the toolbar (looks like a shield icon)
3. A **popup window appears** showing:
   - **"CyberGuard"** title
   - **"Scan All Open Tabs"** button
   - Status area showing "Scanning..." then "Scan complete"
   - **Results table** with columns:
     - **Title**: Tab page title
     - **URL**: Full website URL
     - **Risk**: Color-coded score (0-100)

---

## 🟢 Understanding Risk Score Colors

| Score Range | Color | Threat Level | Meaning |
|---|---|---|---|
| 0-24 | 🟢 Green | LOW | Safe to visit |
| 25-49 | 🟡 Yellow | MEDIUM | Suspicious - proceed with caution |
| 50-100 | 🔴 Red | HIGH | Dangerous - avoid this site |

---

## 📊 Example Results

When you scan tabs, you'll see results like:

| Title | URL | Risk |
|---|---|---|
| Google | https://google.com | 🟢 8 |
| GitHub - Where the world builds software | https://github.com | 🟢 12 |
| Phishing Example | http://login-secure.xyz/verify | 🟡 28 |
| Bit.ly Shortener | http://bit.ly/malware.exe | 🟡 35 |

---

## 🔄 How Scanning Works

### When You Click "Scan All Open Tabs":

1. **Extension queries all open tabs** in the current browser window
2. **Filters out system tabs** (chrome://, chrome-extension://)
3. **For each tab URL**, sends a request to the backend:
   - Backend analyzes the URL against 13 security features
   - Calculates risk score (0-100)
   - Returns result
4. **If backend is offline**, uses **local scoring algorithm** (built-in fallback)
5. **Results displayed in popup table**
6. **Last updated timestamp** shown at bottom
7. **Tabs reported to backend** for dashboard visibility

---

## 🛠️ Troubleshooting

### Problem: Extension doesn't appear in toolbar
- **Solution**: 
  - Go to `chrome://extensions/`
  - Make sure extension is **enabled** (toggle should be ON)
  - Look for CyberGuard in the extensions list

### Problem: "Load unpacked" button doesn't appear
- **Solution**:
  - Make sure **Developer Mode** toggle is enabled (top-right)
  - Refresh the extensions page

### Problem: Clicking "Scan All Open Tabs" shows no results
- **Solution**:
  - Make sure backend server is running: `node backend/server.js`
  - Check terminal for error messages
  - Verify connection: Open another terminal and run:
    ```powershell
    Invoke-RestMethod -Uri 'http://localhost:5000/api/health' -Method Get
    ```
  - If no connection, start backend server again

### Problem: Scores show 0 for all tabs
- **Solution**:
  - This usually means local fallback is active (backend offline)
  - Start backend: `node backend/server.js`
  - Click "Scan All Open Tabs" again

### Problem: Extension shows "No tabs found"
- **Solution**:
  - Open at least 2-3 tabs with different websites
  - Try again - some tabs may be blocked by browser

---

## 📱 What Gets Scanned

Each tab URL is analyzed against **13 security features**:

1. **HTTP Protocol** - HTTP vs HTTPS (HTTP = risky)
2. **Suspicious Keywords** - login, verify, confirm, password, etc.
3. **Suspicious TLDs** - .xyz, .top, .click, .download, etc.
4. **Subdomain Depth** - Too many subdomains = suspicious
5. **Hostname Length** - Very long or very short = risky
6. **IP Address** - Direct IP in URL = suspicious
7. **URL Shorteners** - bit.ly, tinyurl.com, etc. = risky
8. **Malicious Files** - .exe, .bat, .zip, .apk, etc.
9. **Path Entropy** - Highly random path = suspicious
10. **Encoded Parameters** - Too many params = risky
11. **Punycode** - xn-- domains = potential homograph attack
12. **Whitelist Bonus** - Known safe sites (google, github, etc.) get -15 points
13. **Short Domain Name** - Very short names = less trustworthy

---

## ✨ What Happens in the Background

- **Automatic scanning** on extension load
- **Chrome's Tab API** used to query all open tabs
- **No data collection** beyond risk scoring
- **Backend reporting** for dashboard integration
- **Offline capability** - works even if backend is down

---

## 🎯 Next Steps

1. ✅ Load extension in your browser
2. ✅ Open multiple tabs
3. ✅ Click CyberGuard icon
4. ✅ Click "Scan All Open Tabs"
5. ✅ Review risk scores
6. ✅ Check backend dashboard at `http://localhost:5000`

---

## 📞 Support

If tabs aren't being scanned:
1. Check backend is running: `node backend/server.js`
2. Check console for errors: Press `F12` → Console tab
3. Verify manifest.json is correct
4. Try reloading extension (disable/enable toggle on extensions page)
