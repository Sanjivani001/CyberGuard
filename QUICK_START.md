# CyberGuard - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ installed
- MongoDB Atlas account (free tier available)
- IPQS API key (free tier: 35 requests/day)
- Chrome browser (for extension)

### Installation & Setup

1. **Clone and Install Dependencies**
   ```bash
   cd CyberGuard
   npm install
   ```

2. **Configure Environment Variables**
   
   Update `.env`:
   ```bash
   PORT=5000
   MONGO_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/CyberGuard
   IPQS_KEY=your-ipqs-api-key-here
   MONITOR_URLS=                    # Leave empty (disabled)
   RISK_THRESHOLD=50                # Adjust as needed
   SCAN_INTERVAL_MS=3600000        # 1 hour
   ALLOW_OFFLINE_START=true         # For local development
   ```

3. **Start the Server**
   ```bash
   npm start         # Production
   npm run dev       # Development (with auto-reload)
   ```

4. **Access the Dashboard**
   - Open browser to `http://localhost:5000`
   - Scan URLs in the main form
   - View results in real-time

---

## 📊 Features

### URL Scanning
- Enter any URL and get instant threat assessment
- Risk score from 0-100 (higher = more risky)
- Detailed analysis of threats (phishing, malware, suspicious)

### IP Scanning (Via API)
```bash
curl -X POST http://localhost:5000/api/scan-ip \
  -H "Content-Type: application/json" \
  -d '{"ip":"8.8.8.8"}'
```

### Browser Extension
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `/extention` folder
5. Click the extension icon and "Scan All Open Tabs"

### Dashboard Controls
- **Manual Scan Result**: Shows latest scan
- **Open Browser Tabs**: Lists tabs from extension with risk scores
- **Recent Scans History**: Scrollable table of all scans
- **Clear Display**: Clears on-screen data (keeps in DB)
- **Refresh Display**: Re-fetches data from server

---

## 🔌 API Reference

### Scan URLs
```bash
POST /api/scan-url
Content-Type: application/json
{"url": "https://example.com"}

Response:
{
  "success": true,
  "data": {
    "risk_score": 0,
    "phishing": false,
    "malware": false,
    "suspicious": false,
    ...
  }
}
```

### Scan IPs
```bash
POST /api/scan-ip
Content-Type: application/json
{"ip": "8.8.8.8"}

Response:
{
  "success": true,
  "data": {
    "risk_score": 12,
    "vpn": false,
    "proxy": false,
    "tor": false,
    ...
  }
}
```

### Get Recent Alerts
```bash
GET /api/recent-alerts

Response: [
  {
    "target": "example.com",
    "riskScore": 15,
    "flagged": false,
    "createdAt": "2025-12-04T07:07:13.721Z"
  },
  ...
]
```

### Clear All Scans
```bash
DELETE /api/clear-all-alerts

Response:
{
  "ok": true,
  "message": "All alerts cleared"
}
```

### Tab Monitoring (Extension)
```bash
POST /api/report-open-tabs
Content-Type: application/json
{
  "tabs": [
    {"url": "https://example.com", "title": "Example"},
    {"url": "https://google.com", "title": "Google"}
  ]
}

Response: { "ok": true }
```

```bash
GET /api/open-tabs

Response: [
  {
    "url": "https://example.com",
    "title": "Example",
    "lastSeen": 1701680000000,
    "riskScore": 15,
    "flagged": false
  },
  ...
]
```

---

## 🐛 Troubleshooting

### "MongoDB connection failed"
- Check `MONGO_URI` in `.env` is correct
- Ensure IP is whitelisted in MongoDB Atlas
- Use `ALLOW_OFFLINE_START=true` to run without DB

### "Scan failed" Error
- Check IPQS API key is correct
- Verify API quota (free tier: 35 requests/day)
- Check server console for detailed error

### Extension not working
- Verify manifest.json is valid
- Check browser console (F12) for errors
- Ensure backend server is running
- Test with `curl http://localhost:5000/api/health`

### No data in "Open Browser Tabs"
- Install extension properly
- Click "Scan All Open Tabs" button
- Check extension background logs (F12 → Extensions)
- Verify tabs are being reported to backend

---

## 📈 Monitoring & Logging

### Server Logs
Watch console output for:
- `[POST /api/scan-url]` - URL scan requests
- `[POST /api/scan-ip]` - IP scan requests
- `[scanUrl] IPQS Response Status: 200` - Successful IPQS call
- `[scanUrl] Risk Score: X` - Extracted score

### Browser Console Logs
Press F12 and check Console for:
- `[CyberGuard] Initializing event listeners...` - Page ready
- `[CyberGuard] Clear Display clicked` - Button actions
- Network tab shows all API calls

### Extension Debug
1. Go to `chrome://extensions`
2. Find "CyberGuard Auto Scanner"
3. Click "background page" link
4. Check console for logs like:
   - `[triggerScanAndReportOpenTabs] Found X total tabs`
   - `[scanTabUrl] Result for...`
   - `[reportOpenTabs] Response:...`

---

## 🔧 Configuration Tips

### Reduce API Quota Usage
```bash
# Disable auto-monitoring
MONITOR_URLS=

# Increase check interval to 1 day
SCAN_INTERVAL_MS=86400000
```

### Lower False Positives
```bash
# Increase risk threshold
RISK_THRESHOLD=75  # Only flag scores 75+
```

### Better Performance
```bash
# Reduce history size (DB query limit)
# Edit backend/routes/dashboard.js line 20:
# .limit(50)  # Instead of 100
```

---

## 📝 File Structure

```
CyberGuard/
├── backend/
│   ├── server.js              # Express app & MongoDB connection
│   ├── models/
│   │   └── Alert.js           # Scan result schema
│   └── routes/
│       ├── scan.js            # /api/scan-url, /api/scan-ip endpoints
│       └── dashboard.js       # /api/recent-alerts endpoint
├── frontend/
│   ├── public/
│   │   ├── app.js             # Auto-refresh logic
│   │   ├── script.js          # IP scan form (frontend)
│   │   └── style.css          # Styling
│   └── views/
│       └── index.ejs          # Main dashboard template
├── extention/
│   ├── background.js          # Tab scanner & reporter
│   ├── popup.html             # Extension popup UI
│   ├── popup.js               # Popup click handlers
│   └── menifest.json          # Extension manifest
├── .env                       # Configuration
├── package.json               # Dependencies
└── FIXES_APPLIED.md           # Detailed fix documentation
```

---

## 🎯 Next Steps

1. **Test all endpoints** using the curl examples above
2. **Load extension** in Chrome and test tab scanning
3. **Monitor logs** while scanning to understand flow
4. **Upgrade IPQS plan** when ready for production
5. **Add authentication** for security
6. **Deploy to cloud** (Vercel, Heroku, AWS)

---

## 📞 Support

For issues:
1. Check `FIXES_APPLIED.md` for detailed technical info
2. Review server console output
3. Check browser DevTools console
4. Verify `.env` configuration
5. Test individual endpoints with curl

