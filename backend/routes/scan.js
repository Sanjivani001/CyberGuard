const express = require('express');
const router = express.Router();
const axios = require('axios');
const Alert = require('../models/Alert');

const IPQS_KEY = process.env.IPQS_KEY;
const IPQS_URL_BASE = 'https://ipqualityscore.com/api/json/';

// ============================================================
// RISK SCORING LOGIC
// ============================================================

/**
 * Old heuristic kept for compatibility (0-100)
 */
function calculateUrlRiskScore(urlString) {
  let score = 0;
  
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();
    const fullUrl = urlString.toLowerCase();

    // +30 if URL contains suspicious keywords
    const suspiciousKeywords = ['login', 'verify', 'confirm', 'update', 'account', 'security', 'authenticate'];
    if (suspiciousKeywords.some(kw => fullUrl.includes(kw))) {
      score += 30;
    }

    // +20 if URL is very short (typically suspicious)
    if (urlString.length < 12) {
      score += 20;
    }

    // +40 if scheme is http:// (not https)
    if (url.protocol === 'http:') {
      score += 40;
    }

    // +30 if TLD is suspicious
    const suspiciousTLDs = ['.xyz', '.top', '.info', '.click', '.download', '.online', '.site', '.space'];
    if (suspiciousTLDs.some(tld => hostname.endsWith(tld))) {
      score += 30;
    }

    // +15 if hostname length is unusual (very long or very short)
    if (hostname.length > 50 || hostname.length < 3) {
      score += 15;
    }

    // +10 if URL uses IP address instead of domain
    if (/^\d+\.\d+\.\d+\.\d+/.test(hostname)) {
      score += 10;
    }

    // +20 if contains base64 or encoded content
    if (fullUrl.includes('%') || (fullUrl.includes('=') && fullUrl.includes('&'))) {
      score += 20;
    }

  } catch (err) {
    console.warn('[calculateUrlRiskScore] Error parsing URL:', err.message);
  }

  // Clamp score to 0-100
  return Math.min(100, Math.max(0, score));
}


/**
 * NEW: Calculate risk score v2 for a URL using a weighted feature model
 * Returns an object: { score: 0-100, breakdown: { feature: value, ... } }
 */
function calculateUrlRiskScoreV2(urlString) {
  const breakdown = {};
  let total = 0;

  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    const path = url.pathname || '/';
    const full = urlString.toLowerCase();

    // Feature: scheme (http is riskier)
    breakdown.scheme = url.protocol === 'http:' ? 30 : 0;
    total += breakdown.scheme;

    // Feature: suspicious keywords frequency (expanded phishing keywords)
    const suspiciousKeywords = ['login', 'verify', 'confirm', 'update', 'account', 'security', 'authenticate', 'bank', 'paypal', 'secure', 'reset', 'password', 'signin', 'sign-in', 'auth', 'credential'];
    let keywordMatches = 0;
    suspiciousKeywords.forEach(kw => { if (full.includes(kw)) keywordMatches++; });
    breakdown.keywordScore = Math.min(45, keywordMatches * 10);
    total += breakdown.keywordScore;

    // Feature: suspicious TLDs
    const suspiciousTLDs = ['.xyz', '.top', '.info', '.click', '.download', '.online', '.site', '.space', '.icu', '.bid', '.date', '.work', '.pw', '.tk', '.ml', '.cf'];
    breakdown.tld = suspiciousTLDs.some(t => hostname.endsWith(t)) ? 30 : 0;
    total += breakdown.tld;

    // Feature: hostname length and subdomain depth
    const parts = hostname.split('.').filter(Boolean);
    breakdown.subdomainDepth = Math.max(0, parts.length - 2) * 5; // each extra subdomain adds risk
    breakdown.hostLen = (hostname.length > 50 || hostname.length < 3) ? 15 : 0;
    total += breakdown.subdomainDepth + breakdown.hostLen;

    // Feature: IP address usage
    breakdown.ipHostname = /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ? 25 : 0;
    total += breakdown.ipHostname;

    // Feature: URL shortener / redirect services (known shorteners are risky)
    const shortenerDomains = ['bit.ly', 'tinyurl.com', 'ow.ly', 'short.link', 'qr.net', 'goo.gl', 'shortz.com', 'u.to'];
    breakdown.shortenerDomain = shortenerDomains.some(s => hostname.includes(s)) ? 35 : 0;
    total += breakdown.shortenerDomain;

    // Feature: suspicious file downloads in URL
    const dangerousExtensions = ['.exe', '.bat', '.com', '.scr', '.zip', '.rar', '.dmg', '.msi', '.apk', '.iso'];
    breakdown.dangerousFile = dangerousExtensions.some(ext => full.includes(ext)) ? 40 : 0;
    total += breakdown.dangerousFile;

    // Feature: path entropy (naive Shannon entropy on path)
    const freq = {};
    for (let ch of path) freq[ch] = (freq[ch]||0)+1;
    let entropy = 0;
    const len = path.length || 1;
    for (let k in freq) { const p = freq[k]/len; entropy -= p * Math.log2(p); }
    breakdown.pathEntropy = Math.round(entropy * 10) / 10;
    breakdown.pathEntropyScore = entropy > 4 ? 20 : (entropy > 3 ? 10 : 0);
    total += breakdown.pathEntropyScore;

    // Feature: encoded content or many query params
    const queryParams = url.search ? url.search.split('&').length : 0;
    breakdown.encodedOrParams = (full.includes('%') || queryParams > 3) ? 15 : 0;
    total += breakdown.encodedOrParams;

    // Feature: punycode / homograph (xn--) detection
    breakdown.punycode = hostname.includes('xn--') ? 30 : 0;
    total += breakdown.punycode;

    // Feature: known whitelist (legitimate high-traffic sites)
    const whitelistDomains = ['google.com', 'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'github.com', 'stackoverflow.com', 'wikipedia.org', 'amazon.com', 'microsoft.com'];
    breakdown.whitelistBonus = whitelistDomains.some(w => hostname.includes(w)) ? -15 : 0;  // Negative = reduces score
    total += breakdown.whitelistBonus;

    // Small-hostname shortness penalty
    breakdown.shortName = hostname.length < 4 ? 10 : 0;
    total += breakdown.shortName;

  } catch (err) {
    console.warn('[calculateUrlRiskScoreV2] URL parse error:', err && err.message);
    breakdown.error = err && err.message;
  }

  // Normalize: max theoretical total ~ 325; scale to 0-100
  const maxPossible = 325; // updated cap with new features
  const raw = Math.min(total, maxPossible);
  const score = Math.min(100, Math.round((raw / maxPossible) * 100));  // clamp to 100
  return { score, breakdown };
}

/**
 * Calculate risk score for an IP address (basic logic)
 */
function calculateIpRiskScore(ip) {
  let score = 0;
  
  // Check if private IP
  const parts = ip.split('.');
  if (parts.length === 4) {
    const firstOctet = parseInt(parts[0]);
    // Private IP ranges: 10.x.x.x, 127.x.x.x, 172.16-31.x.x, 192.168.x.x
    if (firstOctet === 10 || firstOctet === 127 || (firstOctet === 172 && parseInt(parts[1]) >= 16 && parseInt(parts[1]) <= 31) || (firstOctet === 192 && parseInt(parts[1]) === 168)) {
      return 0; // Private IPs are safe
    }
  }

  return score;
}

// ============================================================
// IPQS API UTILITIES
// ============================================================

/**
 * Call IPQS API for URL scanning
 */
async function scanUrlWithIPQS(targetUrl) {
  const encodedUrl = encodeURIComponent(targetUrl);
  const api = `${IPQS_URL_BASE}url/${IPQS_KEY}/${encodedUrl}`;
  console.log('[scanUrlWithIPQS] Calling:', api);
  
  try {
    const resp = await axios.get(api, { 
      timeout: 15000,
      headers: { 'User-Agent': 'CyberGuard-Scanner' }
    });
    console.log('[scanUrlWithIPQS] Success, risk_score:', resp.data.risk_score);
    return resp.data;
  } catch (err) {
    console.error('[scanUrlWithIPQS] Error:', err.message);
    throw err;
  }
}

/**
 * Call IPQS API for IP scanning
 */
async function scanIpWithIPQS(ip) {
  const api = `${IPQS_URL_BASE}ip/${IPQS_KEY}/${ip}`;
  console.log('[scanIpWithIPQS] Calling:', api);
  
  try {
    const resp = await axios.get(api, { timeout: 15000 });
    console.log('[scanIpWithIPQS] Success, risk_score:', resp.data.risk_score);
    return resp.data;
  } catch (err) {
    console.error('[scanIpWithIPQS] Error:', err.message);
    throw err;
  }
}

// ============================================================
// DATABASE UTILITIES
// ============================================================

/**
 * Save an alert to the database
 */
async function saveAlert(target, type, riskScore, ipqsData = null) {
  try {
    const alert = new Alert({
      target,
      type,
      riskScore,
      raw: ipqsData || {},
      flagged: riskScore >= 50
    });
    await alert.save();
    console.log(`[saveAlert] Saved alert: ${target} (score: ${riskScore})`);
    return alert;
  } catch (err) {
    console.error('[saveAlert] Error:', err.message);
    throw err;
  }
}

// ============================================================
// ENDPOINTS
// ============================================================

/**
 * POST /api/scan-url
 * Manual URL scan endpoint
 * Body: { url: "https://example.com" }
 */
router.post('/api/scan-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // normalize URL (allow users to enter 'example.com' without scheme)
    let targetUrl = String(url).trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    console.log(`[POST /api/scan-url] Scanning URL: ${targetUrl}`);

    // Calculate local risk score (legacy)
    let riskScore = calculateUrlRiskScore(targetUrl);
    let ipqsData = null;

    // Try to get IPQS data if available
    if (IPQS_KEY) {
      try {
        ipqsData = await scanUrlWithIPQS(targetUrl);
        // Use IPQS risk_score if available and higher than our calculation
        if (ipqsData && typeof ipqsData.risk_score === 'number') {
          riskScore = Math.max(riskScore, ipqsData.risk_score);
        }
      } catch (err) {
        console.warn('[POST /api/scan-url] IPQS failed, using local score only');
        // Fall back to local scoring
      }
    }

    // Clamp to 0-100
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Save to database if connected
    let alert = null;
    if (global.DB_CONNECTED) {
      alert = await saveAlert(targetUrl, 'url', riskScore, ipqsData);
    }

    res.json({
      success: true,
      data: {
        target: targetUrl,
        type: 'url',
        riskScore,
        threat: riskScore >= 50 ? 'HIGH' : (riskScore >= 25 ? 'MEDIUM' : 'LOW'),
        flagged: riskScore >= 50,
        raw: ipqsData || null,
        _id: alert?._id || null
      }
    });

  } catch (err) {
    console.error('[POST /api/scan-url] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/scan-ip
 * Manual IP scan endpoint
 * Body: { ip: "1.2.3.4" }
 */
router.post('/api/scan-ip', async (req, res) => {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP is required'
      });
    }

    console.log(`[POST /api/scan-ip] Scanning IP: ${ip}`);

    // Calculate local risk score
    let riskScore = calculateIpRiskScore(ip);
    let ipqsData = null;

    // Try to get IPQS data if available
    if (IPQS_KEY) {
      try {
        ipqsData = await scanIpWithIPQS(ip);
        // Use IPQS risk_score if available and higher than our calculation
        if (ipqsData && typeof ipqsData.risk_score === 'number') {
          riskScore = Math.max(riskScore, ipqsData.risk_score);
        }
      } catch (err) {
        console.warn('[POST /api/scan-ip] IPQS failed, using local score only');
        // Fall back to local scoring
      }
    }

    // Clamp to 0-100
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Save to database if connected
    let alert = null;
    if (global.DB_CONNECTED) {
      alert = await saveAlert(ip, 'ip', riskScore, ipqsData);
    }

    res.json({
      success: true,
      data: {
        target: ip,
        type: 'ip',
        riskScore,
        threat: riskScore >= 50 ? 'HIGH' : (riskScore >= 25 ? 'MEDIUM' : 'LOW'),
        flagged: riskScore >= 50,
        raw: ipqsData || null,
        _id: alert?._id || null
      }
    });

  } catch (err) {
    console.error('[POST /api/scan-ip] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/recent-alerts
 * Get the most recent scans/alerts
 */
router.get('/api/recent-alerts', async (req, res) => {
  try {
    if (!global.DB_CONNECTED) {
      return res.json({
        success: true,
        data: []
      });
    }

    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(20);

    res.json({
      success: true,
      data: alerts
    });

  } catch (err) {
    console.error('[GET /api/recent-alerts] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/history
 * Get scan history
 */
router.get('/api/history', async (req, res) => {
  try {
    if (!global.DB_CONNECTED) {
      return res.json({
        success: true,
        data: []
      });
    }

    const history = await Alert.find().sort({ createdAt: -1 }).limit(50);

    res.json({
      success: true,
      data: history
    });

  } catch (err) {
    console.error('[GET /api/history] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * DELETE /api/history/clear
 * Clear all scan history
 */
router.delete('/api/history/clear', async (req, res) => {
  try {
    if (!global.DB_CONNECTED) {
      return res.json({
        success: true,
        data: { deleted: 0 }
      });
    }

    const result = await Alert.deleteMany({});

    res.json({
      success: true,
      data: {
        deleted: result.deletedCount
      }
    });

  } catch (err) {
    console.error('[DELETE /api/history/clear] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/tabs
 * Get all open tabs that were reported
 */
router.get('/api/tabs', async (req, res) => {
  try {
    const tabs = global.openTabs || [];

    res.json({
      success: true,
      data: tabs
    });

  } catch (err) {
    console.error('[GET /api/tabs] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * DELETE /api/tabs/clear
 * Clear all reported tabs
 */
router.delete('/api/tabs/clear', async (req, res) => {
  try {
    const deletedCount = (global.openTabs || []).length;
    global.openTabs = [];

    res.json({
      success: true,
      data: { deleted: deletedCount }
    });

  } catch (err) {
    console.error('[DELETE /api/tabs/clear] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tabs/report
 * Report open tabs from browser extension
 * Body: { tabs: [...] }
 */
router.post('/api/tabs/report', async (req, res) => {
  try {
    const { tabs } = req.body;

    if (!Array.isArray(tabs)) {
      return res.status(400).json({ success: false, error: 'tabs must be an array' });
    }

    // enrich tabs with latest known riskScore from DB (if available)
    const enriched = await Promise.all(tabs.map(async (t) => {
      const url = t.url;
      let riskScore = null;
      if (global.DB_CONNECTED) {
        const latest = await Alert.findOne({ target: url }).sort({ createdAt: -1 }).lean();
        if (latest && typeof latest.riskScore === 'number') riskScore = latest.riskScore;
      }
      return { url: t.url, title: t.title || '', riskScore: riskScore != null ? riskScore : 0 };
    }));

    global.openTabs = enriched;
    console.log(new Date().toISOString(), `[POST /api/tabs/report] Reported ${enriched.length} open tabs (enriched)`);
    // Log each reported tab to server terminal for visibility
    enriched.forEach(t => {
      console.log(new Date().toISOString(), `[POST /api/tabs/report] Tab: ${t.url} | Title: ${t.title || ''} | Score: ${t.riskScore}`);
    });

    res.json({ success: true, data: { stored: enriched.length, tabs: enriched } });

  } catch (err) {
    console.error('[POST /api/tabs/report] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Backwards-compatible route used by older extension builds
router.post('/api/report-open-tabs', async (req, res) => {
  try {
    const { tabs } = req.body;
    if (!Array.isArray(tabs)) return res.status(400).json({ success: false, error: 'tabs must be an array' });

    // Reuse same enrichment logic
    const enriched = await Promise.all(tabs.map(async (t) => {
      const url = t.url;
      let riskScore = null;
      if (global.DB_CONNECTED) {
        const latest = await Alert.findOne({ target: url }).sort({ createdAt: -1 }).lean();
        if (latest && typeof latest.riskScore === 'number') riskScore = latest.riskScore;
      }
      return { url: t.url, title: t.title || '', riskScore: riskScore != null ? riskScore : 0 };
    }));

    global.openTabs = enriched;
    console.log(new Date().toISOString(), `[POST /api/report-open-tabs] Reported ${enriched.length} open tabs (alias)`);
    enriched.forEach(t => {
      console.log(new Date().toISOString(), `[POST /api/report-open-tabs] Tab: ${t.url} | Title: ${t.title || ''} | Score: ${t.riskScore}`);
    });
    res.json({ success: true, data: { stored: enriched.length, tabs: enriched } });
  } catch (err) {
    console.error('[POST /api/report-open-tabs] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date(), db: global.DB_CONNECTED ? 'connected' : 'offline' } });
});

// POST /scan - form submission from index.ejs (renders page)

/**
 * POST /api/scan-url-v2
 * New scanning endpoint that returns the V2 score and breakdown
 * Body: { url: 'https://example.com' }
 */
router.post('/api/scan-url-v2', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

    // normalize
    let targetUrl = String(url).trim();
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;

    console.log('[POST /api/scan-url-v2] Scanning URL (v2):', targetUrl);

    // Calculate v2 score
    const v2 = calculateUrlRiskScoreV2(targetUrl);
    let ipqsData = null;

    // Optionally try IPQS and prefer higher score
    if (IPQS_KEY) {
      try {
        ipqsData = await scanUrlWithIPQS(targetUrl);
        if (ipqsData && typeof ipqsData.risk_score === 'number') {
          // if IPQS is higher, use it but still include breakdown
          if (ipqsData.risk_score > v2.score) v2.score = ipqsData.risk_score;
        }
      } catch (err) {
        console.warn('[POST /api/scan-url-v2] IPQS failed, returning v2 only');
      }
    }

    const finalScore = Math.min(100, Math.max(0, v2.score));

    // Save to DB
    let alert = null;
    if (global.DB_CONNECTED) {
      alert = await saveAlert(targetUrl, 'url', finalScore, ipqsData);
    }

    res.json({ success: true, data: { target: targetUrl, riskScore: finalScore, breakdown: v2.breakdown, raw: ipqsData || null, _id: alert?._id || null } });
  } catch (err) {
    console.error('[POST /api/scan-url-v2] Error:', err);
    res.status(500).json({ success: false, error: err && err.message });
  }
});

router.post('/scan', async (req, res) => {
  try {
    const url = req.body.url;

    if (!url) {
      const alerts = global.DB_CONNECTED ? await Alert.find().sort({ createdAt: -1 }).limit(100) : [];
      return res.render('index', { result: null, error: 'URL is required', scans: alerts, manualResult: null });
    }

    // normalize URL so users can submit naked domains like "instagram.com"
    let targetUrl = String(url).trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    console.log('[POST /scan] Form submission received:', { url: targetUrl });

    // reuse same logic as /api/scan-url
    let riskScore = calculateUrlRiskScore(targetUrl);
    let ipqsData = null;

    if (IPQS_KEY) {
      try {
        ipqsData = await scanUrlWithIPQS(targetUrl);
        if (ipqsData && typeof ipqsData.risk_score === 'number') {
          riskScore = Math.max(riskScore, ipqsData.risk_score);
        }
      } catch (err) {
        console.warn('[POST /scan] IPQS failed, using local score only');
      }
    }

    riskScore = Math.min(100, Math.max(0, riskScore));

    let saved = null;
    if (global.DB_CONNECTED) {
      saved = await saveAlert(targetUrl, 'url', riskScore, ipqsData);
    }

    const alerts = global.DB_CONNECTED ? await Alert.find().sort({ createdAt: -1 }).limit(100) : [];

    // prepare a manualResult object similar to what the EJS expects
    const manualResult = {
      url: targetUrl,
      risk: riskScore,
      hints: (riskScore >= 50 ? 'HIGH RISK' : (riskScore >= 25 ? 'MEDIUM RISK' : 'LOW RISK'))
    };

    res.render('index', { result: null, error: null, scans: alerts, manualResult });
  } catch (err) {
    console.error('[POST /scan] Error:', err.message || err);
    const alerts = global.DB_CONNECTED ? await Alert.find().sort({ createdAt: -1 }).limit(100) : [];
    res.render('index', { result: null, error: 'Internal error', scans: alerts, manualResult: null });
  }
});

module.exports = router;

